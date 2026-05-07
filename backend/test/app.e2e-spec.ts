import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Intelligent Investor API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    // Clean slate (cascades into spending_plans).
    await prisma.financialProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.financialProfile.deleteMany();
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 when the database is reachable', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        database: 'connected',
      });
    });
  });

  describe('POST /api/calculations/preview', () => {
    it('returns the four buckets and 15-year projection without saving', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600 })
        .expect(200);

      expect(res.body.buckets).toEqual({
        fixedCosts: 7480,
        savingsGoals: 1360,
        activeInvestments: 1360,
        guiltFreeSpending: 3740,
      });
      expect(res.body.projection).toHaveLength(15);
      expect(res.body.projection[0]).toEqual({ year: 1, value: 1455.2 });

      // Confirm we did NOT persist the calculation.
      const count = await prisma.financialProfile.count();
      expect(count).toBe(0);
    });

    it('rejects invalid input', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: -1, bankNet: 1 })
        .expect(400);
    });

    it('accepts custom percentage overrides and returns adjusted buckets', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({
          grossSalary: 20000,
          bankNet: 13600,
          fixedCostsPercent: 50,
          guiltFreeSpendingPercent: 25,
        })
        .expect(200);

      expect(res.body.buckets.fixedCosts).toBe(6800);        // 13600 × 0.50
      expect(res.body.buckets.savingsGoals).toBe(1360);      // always 10%
      expect(res.body.buckets.activeInvestments).toBe(1360); // always 10%
      expect(res.body.buckets.guiltFreeSpending).toBe(3400); // 13600 × 0.25
      expect(res.body.fixedCostsPercent).toBe(50);
      expect(res.body.guiltFreeSpendingPercent).toBe(25);
      // Balanced at exactly 100% — projection seed unchanged (active investments fixed)
      expect(res.body.projection[0]).toEqual({ year: 1, value: 1455.2 });
    });

    it('rejects fixedCostsPercent below the 50% floor', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600, fixedCostsPercent: 45 })
        .expect(400);
    });

    it('rejects guiltFreeSpendingPercent above the 35% ceiling', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600, guiltFreeSpendingPercent: 40 })
        .expect(400);
    });
  });

  describe('POST /api/calculations/monthly-contribution-projection', () => {
    it('returns 15 projection points for a valid request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations/monthly-contribution-projection')
        .send({ monthlyContribution: 68, annualReturnRate: 0.07, years: 15 })
        .expect(200);

      expect(res.body.monthlyContribution).toBe(68);
      expect(res.body.annualReturnRate).toBe(0.07);
      expect(res.body.years).toBe(15);
      expect(res.body.projection).toHaveLength(15);
      expect(res.body.projection[14].year).toBe(15);
      // Final value should be ≈ 21553
      expect(res.body.projection[14].value).toBeCloseTo(21553.44, 0);
    });

    it('uses defaults (7% / 15 years) when optional fields are omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations/monthly-contribution-projection')
        .send({ monthlyContribution: 68 })
        .expect(200);

      expect(res.body.projection).toHaveLength(15);
      expect(res.body.annualReturnRate).toBe(0.07);
      expect(res.body.years).toBe(15);
    });

    it('rejects negative monthlyContribution with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/monthly-contribution-projection')
        .send({ monthlyContribution: -1 })
        .expect(400);
    });

    it('rejects missing monthlyContribution with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/monthly-contribution-projection')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/currencies', () => {
    it('returns the supported list, default, and ILS-anchored rate table', async () => {
      const res = await request(app.getHttpServer()).get('/api/currencies').expect(200);
      expect(res.body.supported).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
      expect(res.body.default).toBe('ILS');
      expect(res.body.ratesInIls).toEqual({
        ILS: 1,
        USD: 3.7,
        EUR: 4.0,
        GBP: 4.7,
      });
    });
  });

  describe('Currency on calculations', () => {
    it('echoes the currency field back from /preview, defaulting to ILS', async () => {
      const def = await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600 })
        .expect(200);
      expect(def.body.currency).toBe('ILS');

      const explicit = await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600, currency: 'GBP' })
        .expect(200);
      expect(explicit.body.currency).toBe('GBP');
    });

    it('rejects an unsupported currency on /preview with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations/preview')
        .send({ grossSalary: 20000, bankNet: 13600, currency: 'JPY' })
        .expect(400);
    });

    it('echoes the currency field back from /monthly-contribution-projection', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations/monthly-contribution-projection')
        .send({ monthlyContribution: 68, currency: 'EUR' })
        .expect(200);
      expect(res.body.currency).toBe('EUR');
    });
  });

  describe('Profiles CRUD', () => {
    let createdId: string;

    it('POST /api/profiles creates and returns a profile + plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/profiles')
        .send({ name: 'Alice', grossSalary: 20000, bankNet: 13600 })
        .expect(201);

      expect(res.body.name).toBe('Alice');
      expect(res.body.spendingPlan.fixedCosts).toBe(7480);
      expect(res.body.spendingPlan.projectionData).toHaveLength(15);
      createdId = res.body.id;
    });

    it('GET /api/profiles returns the saved profile', async () => {
      const res = await request(app.getHttpServer()).get('/api/profiles').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.find((p: { id: string }) => p.id === createdId)).toBeTruthy();
    });

    it('GET /api/profiles/:id returns one profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/profiles/${createdId}`)
        .expect(200);
      expect(res.body.id).toBe(createdId);
      expect(res.body.spendingPlan.savingsGoals).toBe(1360);
    });

    it('GET /api/profiles/:id returns 404 for missing id', async () => {
      await request(app.getHttpServer())
        .get('/api/profiles/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('DELETE /api/profiles/:id removes the profile', async () => {
      await request(app.getHttpServer()).delete(`/api/profiles/${createdId}`).expect(200);
      await request(app.getHttpServer()).get(`/api/profiles/${createdId}`).expect(404);
    });
  });

  describe('Currency on profiles', () => {
    afterEach(async () => {
      await prisma.financialProfile.deleteMany();
    });

    it('defaults currency to ILS when not supplied on create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/profiles')
        .send({ name: 'Yael', grossSalary: 20000, bankNet: 13600 })
        .expect(201);
      expect(res.body.currency).toBe('ILS');
    });

    it('persists an explicit currency through create / get / list', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/profiles')
        .send({ name: 'Pierre', grossSalary: 5000, bankNet: 3400, currency: 'EUR' })
        .expect(201);
      expect(created.body.currency).toBe('EUR');

      const fetched = await request(app.getHttpServer())
        .get(`/api/profiles/${created.body.id}`)
        .expect(200);
      expect(fetched.body.currency).toBe('EUR');

      const all = await request(app.getHttpServer()).get('/api/profiles').expect(200);
      expect(
        all.body.find((p: { id: string }) => p.id === created.body.id)?.currency,
      ).toBe('EUR');
    });

    it('rejects an unsupported currency with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/profiles')
        .send({ name: 'Junko', grossSalary: 20000, bankNet: 13600, currency: 'JPY' })
        .expect(400);
    });
  });
});
