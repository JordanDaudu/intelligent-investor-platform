import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoalCategory, Prisma } from '@prisma/client';
import { GoalsService } from './goals.service';

type PrismaMock = {
  financialProfile: { findUnique: jest.Mock };
  financialGoal: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

function makePrismaMock(): PrismaMock {
  return {
    financialProfile: { findUnique: jest.fn() },
    financialGoal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'goal-uuid',
    profileId: 'profile-uuid',
    title: 'Buy Apartment',
    category: GoalCategory.APARTMENT,
    targetAmount: new Prisma.Decimal(1000000),
    currentAmount: new Prisma.Decimal(250000),
    targetDate: new Date('2034-07-01T00:00:00.000Z'),
    expectedReturn: new Prisma.Decimal(0.07),
    createdAt: new Date('2026-05-07T10:00:00.000Z'),
    updatedAt: new Date('2026-05-07T10:00:00.000Z'),
    ...overrides,
  };
}

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new GoalsService(prisma as never);
  });

  describe('create', () => {
    const baseDto = {
      profileId: 'profile-uuid',
      title: 'Buy Apartment',
      category: GoalCategory.APARTMENT,
      targetAmount: 1000000,
      currentAmount: 250000,
      targetDate: '2034-07-01',
      expectedReturn: 0.07,
    };

    it('creates a goal when the profile exists and returns a serialized response', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });
      prisma.financialGoal.create.mockResolvedValue(makeRow());

      const result = await service.create(baseDto);

      const args = prisma.financialGoal.create.mock.calls[0][0];
      expect(args.data.profileId).toBe('profile-uuid');
      expect(args.data.targetAmount).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.currentAmount).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.expectedReturn).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.targetDate).toBeInstanceOf(Date);
      expect(args.data.category).toBe(GoalCategory.APARTMENT);

      expect(result.id).toBe('goal-uuid');
      expect(result.targetAmount).toBe(1000000);
      expect(result.currentAmount).toBe(250000);
      expect(result.expectedReturn).toBe(0.07);
      expect(typeof result.targetDate).toBe('string');
      expect(typeof result.createdAt).toBe('string');
    });

    it('defaults expectedReturn to 0.07 when omitted', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });
      prisma.financialGoal.create.mockResolvedValue(makeRow());

      const dto = { ...baseDto };
      delete (dto as { expectedReturn?: number }).expectedReturn;
      await service.create(dto);

      const args = prisma.financialGoal.create.mock.calls[0][0];
      expect(Number(args.data.expectedReturn)).toBe(0.07);
    });

    it('throws NotFoundException when the referenced profile is missing', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.financialGoal.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when targetDate is in the past', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });

      await expect(
        service.create({ ...baseDto, targetDate: '2000-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findByProfile', () => {
    it('returns mapped goals when the profile exists', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });
      prisma.financialGoal.findMany.mockResolvedValue([makeRow(), makeRow({ id: 'g2' })]);

      const result = await service.findByProfile('profile-uuid');

      expect(prisma.financialGoal.findMany).toHaveBeenCalledWith({
        where: { profileId: 'profile-uuid' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].targetAmount).toBe(1000000);
    });

    it('throws NotFoundException when the profile is missing', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);
      await expect(service.findByProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns the mapped goal when found', async () => {
      prisma.financialGoal.findUnique.mockResolvedValue(makeRow());
      const result = await service.findOne('goal-uuid');
      expect(result.id).toBe('goal-uuid');
    });

    it('throws NotFoundException when the goal is missing', async () => {
      prisma.financialGoal.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates supplied fields and returns the mapped row', async () => {
      const updatedRow = makeRow({
        title: 'Buy Penthouse',
        targetAmount: new Prisma.Decimal(1500000),
      });
      prisma.financialGoal.update.mockResolvedValue(updatedRow);

      const futureIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = await service.update('goal-uuid', {
        title: 'Buy Penthouse',
        targetAmount: 1500000,
        targetDate: futureIso,
      });

      const args = prisma.financialGoal.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'goal-uuid' });
      expect(args.data.title).toBe('Buy Penthouse');
      expect(args.data.targetAmount).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.targetDate).toBeInstanceOf(Date);
      // Untouched fields are not in the update payload
      expect(args.data.currentAmount).toBeUndefined();
      expect(args.data.expectedReturn).toBeUndefined();
      expect(args.data.category).toBeUndefined();

      expect(result.title).toBe('Buy Penthouse');
      expect(result.targetAmount).toBe(1500000);
    });

    it('partial update with only currentAmount preserves other fields', async () => {
      prisma.financialGoal.update.mockResolvedValue(
        makeRow({ currentAmount: new Prisma.Decimal(300000) }),
      );

      await service.update('goal-uuid', { currentAmount: 300000 });

      const args = prisma.financialGoal.update.mock.calls[0][0];
      expect(args.data.currentAmount).toBeInstanceOf(Prisma.Decimal);
      expect(Object.keys(args.data)).toEqual(['currentAmount']);
    });

    it('throws BadRequestException when targetDate is in the past', async () => {
      await expect(
        service.update('goal-uuid', { targetDate: '2000-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.financialGoal.update).not.toHaveBeenCalled();
    });

    it('maps Prisma P2025 to NotFoundException', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
      prisma.financialGoal.update.mockRejectedValue(p2025);

      await expect(service.update('missing', { title: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-P2025 Prisma errors', async () => {
      const other = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.financialGoal.update.mockRejectedValue(other);

      await expect(service.update('id', { title: 'X' })).rejects.toBe(other);
    });
  });

  describe('summarizeForProfile', () => {
    it('returns zero-stats shape when the profile has no goals', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });
      prisma.financialGoal.findMany.mockResolvedValue([]);

      const result = await service.summarizeForProfile('profile-uuid');

      expect(result).toEqual({
        goalCount: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        totalMonthlyRequired: 0,
        overallCompletionPercentage: 0,
        statusCounts: { ON_TRACK: 0, SLIGHTLY_BEHIND: 0, AT_RISK: 0 },
      });
    });

    it('aggregates totals + status counts across goals', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue({ id: 'profile-uuid' });
      const goals = [
        makeRow({
          id: 'g1',
          targetAmount: new Prisma.Decimal(1000),
          currentAmount: new Prisma.Decimal(250),
        }),
        makeRow({
          id: 'g2',
          targetAmount: new Prisma.Decimal(2000),
          currentAmount: new Prisma.Decimal(500),
        }),
      ];
      prisma.financialGoal.findMany.mockResolvedValue(goals);
      // analyze() reads each goal individually
      prisma.financialGoal.findUnique.mockImplementation(async ({ where }) =>
        goals.find((g) => g.id === where.id),
      );

      const result = await service.summarizeForProfile('profile-uuid');

      expect(result.goalCount).toBe(2);
      expect(result.totalTargetAmount).toBe(3000);
      expect(result.totalCurrentAmount).toBe(750);
      expect(result.overallCompletionPercentage).toBe(25); // 750/3000 = 25
      expect(typeof result.totalMonthlyRequired).toBe('number');
      const totalCounts =
        result.statusCounts.ON_TRACK +
        result.statusCounts.SLIGHTLY_BEHIND +
        result.statusCounts.AT_RISK;
      expect(totalCounts).toBe(2);
    });

    it('throws NotFoundException when the profile is missing', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);
      await expect(service.summarizeForProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('returns { id, deleted: true } on success', async () => {
      prisma.financialGoal.delete.mockResolvedValue(makeRow());
      await expect(service.remove('goal-uuid')).resolves.toEqual({ id: 'goal-uuid', deleted: true });
      expect(prisma.financialGoal.delete).toHaveBeenCalledWith({ where: { id: 'goal-uuid' } });
    });

    it('maps Prisma P2025 to NotFoundException', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
      prisma.financialGoal.delete.mockRejectedValue(p2025);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-P2025 Prisma errors', async () => {
      const other = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.financialGoal.delete.mockRejectedValue(other);
      await expect(service.remove('id')).rejects.toBe(other);
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('rounds to a whole percentage', () => {
      expect(service.calculateCompletionPercentage(250000, 1000000)).toBe(25);
      expect(service.calculateCompletionPercentage(333, 1000)).toBe(33);
    });

    it('clamps at 0 and 100', () => {
      expect(service.calculateCompletionPercentage(-100, 1000)).toBe(0);
      expect(service.calculateCompletionPercentage(2000, 1000)).toBe(100);
    });

    it('returns 0 when target is zero or negative (no division by zero)', () => {
      expect(service.calculateCompletionPercentage(100, 0)).toBe(0);
      expect(service.calculateCompletionPercentage(100, -1)).toBe(0);
    });
  });

  describe('buildYearlyProjection', () => {
    it('produces one entry per year compounding annually', () => {
      const points = service.buildYearlyProjection(1000, 0.07, 3);
      expect(points).toEqual([
        { year: 1, value: 1070 },
        { year: 2, value: 1144.9 },
        { year: 3, value: 1225.04 },
      ]);
    });

    it('returns empty array when years <= 0', () => {
      expect(service.buildYearlyProjection(1000, 0.07, 0)).toEqual([]);
    });
  });

  describe('calculateMonthlyRequired', () => {
    it('returns 0 when the goal is already funded', () => {
      // currentAmount alone with growth meets target
      expect(service.calculateMonthlyRequired(1000000, 1000000, 0, 12)).toBe(0);
    });

    it('returns 0 when months <= 0', () => {
      expect(service.calculateMonthlyRequired(0, 1000, 0.07, 0)).toBe(0);
    });

    it('falls back to linear remaining/months when expectedReturn = 0', () => {
      // Need to save 12000 over 12 months at 0% → 1000/month
      expect(service.calculateMonthlyRequired(0, 12000, 0, 12)).toBe(1000);
    });

    it('uses the annuity FV formula when expectedReturn > 0', () => {
      // Manually compute expected PMT for current=0, target=10000 over 12 months at 12% APR
      const monthlyRate = 0.01;
      const months = 12;
      const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      const expected = Math.round((10000 / annuityFactor) * 100) / 100;

      expect(service.calculateMonthlyRequired(0, 10000, 0.12, 12)).toBe(expected);
    });
  });

  describe('calculateStatus', () => {
    it('returns ON_TRACK when projected >= target', () => {
      expect(service.calculateStatus(1000, 1000)).toBe('ON_TRACK');
      expect(service.calculateStatus(1500, 1000)).toBe('ON_TRACK');
    });

    it('returns SLIGHTLY_BEHIND when shortfall < 15%', () => {
      expect(service.calculateStatus(900, 1000)).toBe('SLIGHTLY_BEHIND'); // 10% short
    });

    it('returns AT_RISK when shortfall >= 15%', () => {
      expect(service.calculateStatus(850, 1000)).toBe('AT_RISK'); // 15% short
      expect(service.calculateStatus(500, 1000)).toBe('AT_RISK'); // 50% short
    });
  });

  describe('estimateCompletionDate', () => {
    it("returns today's ISO date when current already meets target", () => {
      const now = new Date('2026-05-07T00:00:00.000Z');
      const result = service.estimateCompletionDate(1000, 500, 0.07, 0, now);
      expect(result).toBe('2026-05-07');
    });

    it('returns null when there is no growth or contribution and target is unreached', () => {
      const now = new Date('2026-05-07T00:00:00.000Z');
      expect(service.estimateCompletionDate(0, 1000, 0, 0, now)).toBeNull();
    });

    it('returns an ISO date in the future when contributions reach the target', () => {
      const now = new Date('2026-05-07T00:00:00.000Z');
      const result = service.estimateCompletionDate(0, 12000, 0, 1000, now);
      expect(result).not.toBeNull();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('analyze', () => {
    it('throws NotFoundException when goal is missing', async () => {
      prisma.financialGoal.findUnique.mockResolvedValue(null);
      await expect(service.analyze('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns analysis fields for an existing goal', async () => {
      const now = new Date('2026-05-07T00:00:00.000Z');
      prisma.financialGoal.findUnique.mockResolvedValue(
        makeRow({
          targetAmount: new Prisma.Decimal(1000000),
          currentAmount: new Prisma.Decimal(250000),
          expectedReturn: new Prisma.Decimal(0.07),
          targetDate: new Date('2034-07-01T00:00:00.000Z'),
        }),
      );

      const result = await service.analyze('goal-uuid', now);

      expect(typeof result.monthlyRequired).toBe('number');
      expect(typeof result.projectedValueAtDeadline).toBe('number');
      expect(result.completionPercentage).toBe(25);
      expect(['ON_TRACK', 'SLIGHTLY_BEHIND', 'AT_RISK']).toContain(result.status);
      expect(Array.isArray(result.projection)).toBe(true);
      expect(result.projection.length).toBeGreaterThan(0);
      expect(result.projection[0].year).toBe(1);
    });
  });
});
