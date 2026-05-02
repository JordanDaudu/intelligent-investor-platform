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
});
