import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProfilesService } from './profiles.service';
import { CalculationsService } from '../calculations/calculations.service';

type PrismaMock = {
  financialProfile: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
};

function makePrismaMock(): PrismaMock {
  return {
    financialProfile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-02T03:04:05.000Z');
  const updatedAt = new Date('2026-01-02T03:04:05.000Z');
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Alice',
    grossSalary: new Prisma.Decimal(20000),
    bankNet: new Prisma.Decimal(13600),
    fixedCostsPercent: null,
    guiltFreeSpendingPercent: null,
    createdAt,
    updatedAt,
    spendingPlan: {
      fixedCosts: new Prisma.Decimal(7480),
      savingsGoals: new Prisma.Decimal(1360),
      activeInvestments: new Prisma.Decimal(1360),
      guiltFreeSpending: new Prisma.Decimal(3740),
      annualReturnRate: new Prisma.Decimal(0.07),
      projectionYears: 15,
      projectionData: [
        { year: 1, value: 1455.2 },
        { year: 2, value: 1557.06 },
      ],
    },
    ...overrides,
  };
}

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: PrismaMock;
  let calculations: CalculationsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    calculations = new CalculationsService();
    service = new ProfilesService(prisma as never, calculations);
  });

  describe('create', () => {
    it('passes overrides to calculations and persists Decimal-wrapped values', async () => {
      const calcSpy = jest.spyOn(calculations, 'calculateFullPlan');
      prisma.financialProfile.create.mockResolvedValue(makeRow());

      const result = await service.create({
        name: 'Alice',
        grossSalary: 20000,
        bankNet: 13600,
        fixedCostsPercent: 55,
        guiltFreeSpendingPercent: 27.5,
      });

      expect(calcSpy).toHaveBeenCalledWith(20000, 13600, {
        fixedCostsPercent: 55,
        guiltFreeSpendingPercent: 27.5,
      });

      const args = prisma.financialProfile.create.mock.calls[0][0];
      expect(args.data.name).toBe('Alice');
      expect(args.data.grossSalary).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.bankNet).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.fixedCostsPercent).toBe(55);
      expect(args.data.guiltFreeSpendingPercent).toBe(27.5);
      expect(args.data.spendingPlan.create.fixedCosts).toBeInstanceOf(Prisma.Decimal);
      expect(args.data.spendingPlan.create.projectionYears).toBe(15);
      expect(args.include).toEqual({ spendingPlan: true });

      expect(result.spendingPlan?.fixedCosts).toBe(7480);
      expect(result.spendingPlan?.projectionData).toHaveLength(2);
      expect(typeof result.createdAt).toBe('string');
    });

    it('persists null override columns when no overrides are provided', async () => {
      prisma.financialProfile.create.mockResolvedValue(makeRow());

      await service.create({ name: 'Bob', grossSalary: 100, bankNet: 68 });

      const args = prisma.financialProfile.create.mock.calls[0][0];
      expect(args.data.fixedCostsPercent).toBeNull();
      expect(args.data.guiltFreeSpendingPercent).toBeNull();
    });
  });

  describe('findAll', () => {
    it('orders by createdAt desc and returns mapped responses', async () => {
      prisma.financialProfile.findMany.mockResolvedValue([makeRow(), makeRow({ id: 'second-id', name: 'Bob' })]);

      const result = await service.findAll();

      expect(prisma.financialProfile.findMany).toHaveBeenCalledWith({
        include: { spendingPlan: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(typeof result[0].grossSalary).toBe('number');
    });

    it('returns an empty array when there are no profiles', async () => {
      prisma.financialProfile.findMany.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the mapped profile when found', async () => {
      const row = makeRow();
      prisma.financialProfile.findUnique.mockResolvedValue(row);

      const result = await service.findOne(row.id);

      expect(prisma.financialProfile.findUnique).toHaveBeenCalledWith({
        where: { id: row.id },
        include: { spendingPlan: true },
      });
      expect(result.id).toBe(row.id);
      expect(result.spendingPlan?.savingsGoals).toBe(1360);
    });

    it('throws NotFoundException when prisma returns null', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('drops malformed projectionData entries from the response', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(
        makeRow({
          spendingPlan: {
            ...makeRow().spendingPlan,
            projectionData: [
              { year: 1, value: 1455.2 },
              { year: 'two', value: 9 }, // bad — wrong type
              { value: 9 },               // bad — missing year
              null,                        // bad — null entry
              { year: 3, value: 'NaN' },  // bad — wrong type
              { year: 4, value: 1700.5 },
            ],
          },
        }),
      );

      const result = await service.findOne('ok');

      expect(result.spendingPlan?.projectionData).toEqual([
        { year: 1, value: 1455.2 },
        { year: 4, value: 1700.5 },
      ]);
    });

    it('returns an empty projectionData array when stored value is not an array', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(
        makeRow({
          spendingPlan: {
            ...makeRow().spendingPlan,
            projectionData: { not: 'an array' },
          },
        }),
      );

      const result = await service.findOne('ok');

      expect(result.spendingPlan?.projectionData).toEqual([]);
    });

    it('returns spendingPlan: null when no plan row is associated', async () => {
      prisma.financialProfile.findUnique.mockResolvedValue(makeRow({ spendingPlan: null }));

      const result = await service.findOne('ok');

      expect(result.spendingPlan).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns { id, deleted: true } on success', async () => {
      prisma.financialProfile.delete.mockResolvedValue(makeRow());

      await expect(service.remove('an-id')).resolves.toEqual({
        id: 'an-id',
        deleted: true,
      });
      expect(prisma.financialProfile.delete).toHaveBeenCalledWith({ where: { id: 'an-id' } });
    });

    it('maps Prisma P2025 (record not found) to NotFoundException', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
      prisma.financialProfile.delete.mockRejectedValue(p2025);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-P2025 Prisma errors', async () => {
      const otherErr = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.financialProfile.delete.mockRejectedValue(otherErr);

      await expect(service.remove('id')).rejects.toBe(otherErr);
    });

    it('rethrows non-Prisma errors as-is', async () => {
      const generic = new Error('network down');
      prisma.financialProfile.delete.mockRejectedValue(generic);

      await expect(service.remove('id')).rejects.toBe(generic);
    });
  });
});
