import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Financial Goals API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let profileId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    // Clean slate (cascades from financial_profiles into spending_plans + financial_goals).
    await prisma.financialProfile.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/api/profiles')
      .send({ name: 'Goals Owner', grossSalary: 20000, bankNet: 13600 })
      .expect(201);
    profileId = res.body.id;
  });

  afterAll(async () => {
    await prisma.financialProfile.deleteMany();
    await app.close();
  });

  /** Future ISO date string to keep tests deterministic. */
  const futureDate = (yearsFromNow: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsFromNow);
    return d.toISOString().slice(0, 10);
  };

  describe('POST /api/goals', () => {
    it('creates a new goal and returns the serialized row', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId,
          title: 'Buy Apartment',
          category: 'APARTMENT',
          targetAmount: 1000000,
          currentAmount: 250000,
          targetDate: futureDate(8),
          expectedReturn: 0.07,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.profileId).toBe(profileId);
      expect(res.body.title).toBe('Buy Apartment');
      expect(res.body.category).toBe('APARTMENT');
      expect(res.body.targetAmount).toBe(1000000);
      expect(res.body.currentAmount).toBe(250000);
      expect(res.body.expectedReturn).toBe(0.07);
    });

    it('returns 404 when the referenced profile does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId: '00000000-0000-0000-0000-000000000000',
          title: 'Ghost Goal',
          category: 'CUSTOM',
          targetAmount: 100,
          currentAmount: 0,
          targetDate: futureDate(1),
        })
        .expect(404);
    });

    it('returns 400 for invalid input (negative targetAmount)', async () => {
      await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId,
          title: 'Bad Goal',
          category: 'CUSTOM',
          targetAmount: -1,
          currentAmount: 0,
          targetDate: futureDate(1),
        })
        .expect(400);
    });

    it('returns 400 when targetDate is in the past', async () => {
      await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId,
          title: 'Past Goal',
          category: 'CUSTOM',
          targetAmount: 100,
          currentAmount: 0,
          targetDate: '2000-01-01',
        })
        .expect(400);
    });
  });

  describe('GET /api/profiles/:id/goals', () => {
    it('returns all goals for the given profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/profiles/${profileId}/goals`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((g: { profileId: string }) => g.profileId === profileId)).toBe(true);
    });

    it('returns 404 for a missing profile', async () => {
      await request(app.getHttpServer())
        .get('/api/profiles/00000000-0000-0000-0000-000000000000/goals')
        .expect(404);
    });
  });

  describe('GET /api/goals/:id and /analysis', () => {
    let goalId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId,
          title: 'Vacation',
          category: 'VACATION',
          targetAmount: 12000,
          currentAmount: 0,
          targetDate: futureDate(1),
          expectedReturn: 0,
        })
        .expect(201);
      goalId = res.body.id;
    });

    it('GET /api/goals/:id returns the goal', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/goals/${goalId}`)
        .expect(200);
      expect(res.body.id).toBe(goalId);
      expect(res.body.title).toBe('Vacation');
    });

    it('GET /api/goals/:id returns 404 for missing goal', async () => {
      await request(app.getHttpServer())
        .get('/api/goals/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('GET /api/goals/:id/analysis returns calculated fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/goals/${goalId}/analysis`)
        .expect(200);

      expect(typeof res.body.monthlyRequired).toBe('number');
      expect(typeof res.body.projectedValueAtDeadline).toBe('number');
      expect(typeof res.body.completionPercentage).toBe('number');
      expect(['ON_TRACK', 'SLIGHTLY_BEHIND', 'AT_RISK']).toContain(res.body.status);
      expect(Array.isArray(res.body.projection)).toBe(true);
      // 12000 / ~12 months at 0% return ≈ 1000
      expect(res.body.monthlyRequired).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('deletes a goal and returns { id, deleted: true }', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/goals')
        .send({
          profileId,
          title: 'Delete Me',
          category: 'CUSTOM',
          targetAmount: 100,
          currentAmount: 0,
          targetDate: futureDate(1),
        })
        .expect(201);

      const id = created.body.id;
      const res = await request(app.getHttpServer())
        .delete(`/api/goals/${id}`)
        .expect(200);
      expect(res.body).toEqual({ id, deleted: true });

      await request(app.getHttpServer()).get(`/api/goals/${id}`).expect(404);
    });

    it('returns 404 when deleting a missing goal', async () => {
      await request(app.getHttpServer())
        .delete('/api/goals/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
