import { CalculationsService, REQUIRED_PROJECTION_YEARS } from './calculations.service';

describe('CalculationsService', () => {
  let svc: CalculationsService;

  beforeEach(() => {
    svc = new CalculationsService();
  });

  describe('estimateBankNet', () => {
    it('returns gross × 0.68 rounded to 2 decimals', () => {
      expect(svc.estimateBankNet(20000)).toBe(13600);
      expect(svc.estimateBankNet(0)).toBe(0);
      expect(svc.estimateBankNet(1234.56)).toBe(839.5);
    });

    it('rejects negative or non-finite values', () => {
      expect(() => svc.estimateBankNet(-1)).toThrow();
      expect(() => svc.estimateBankNet(Number.NaN)).toThrow();
    });
  });

  describe('bucket calculators', () => {
    const bankNet = 13600;

    it('calculateFixedCosts = bankNet × 55%', () => {
      expect(svc.calculateFixedCosts(bankNet)).toBe(7480);
    });

    it('calculateSavingsGoals = bankNet × 10%', () => {
      expect(svc.calculateSavingsGoals(bankNet)).toBe(1360);
    });

    it('calculateActiveInvestments = bankNet × 10%', () => {
      expect(svc.calculateActiveInvestments(bankNet)).toBe(1360);
    });

    it('calculateGuiltFreeSpending = bankNet × 27.5%', () => {
      expect(svc.calculateGuiltFreeSpending(bankNet)).toBe(3740);
    });

    it('the four buckets sum to bankNet × 1.025 (the spec ratios)', () => {
      // 55% + 10% + 10% + 27.5% = 102.5% — the official Common Sense Spending
      // ratios used by this project intentionally exceed 100%.
      const sum =
        svc.calculateFixedCosts(bankNet) +
        svc.calculateSavingsGoals(bankNet) +
        svc.calculateActiveInvestments(bankNet) +
        svc.calculateGuiltFreeSpending(bankNet);
      expect(sum).toBeCloseTo(bankNet * 1.025, 2);
    });

    it('rejects negative bankNet', () => {
      expect(() => svc.calculateFixedCosts(-1)).toThrow();
    });
  });

  describe('calculateWealthProjection', () => {
    it('produces 15 yearly compound points by default at 7%', () => {
      const projection = svc.calculateWealthProjection(1360);
      expect(projection).toHaveLength(REQUIRED_PROJECTION_YEARS);
      expect(projection[0]).toEqual({ year: 1, value: 1455.2 });
      expect(projection[1]).toEqual({ year: 2, value: 1557.06 });
      // Year 15 against the formula: 1360 * 1.07^15
      const expectedYear15 = Math.round(1360 * Math.pow(1.07, 15) * 100) / 100;
      expect(projection[14]).toEqual({ year: 15, value: expectedYear15 });
    });

    it('honors custom annual rate and years (Scenario Lab)', () => {
      const projection = svc.calculateWealthProjection(1000, 0.05, 3);
      expect(projection).toEqual([
        { year: 1, value: 1050 },
        { year: 2, value: 1102.5 },
        { year: 3, value: 1157.63 },
      ]);
    });

    it('rejects invalid inputs', () => {
      expect(() => svc.calculateWealthProjection(-1)).toThrow();
      expect(() => svc.calculateWealthProjection(100, Number.NaN)).toThrow();
      expect(() => svc.calculateWealthProjection(100, 0.07, 0)).toThrow();
      expect(() => svc.calculateWealthProjection(100, 0.07, 1.5)).toThrow();
    });
  });

  describe('calculateFullPlan — default (no overrides)', () => {
    it('matches the spec example for gross 20000 / bankNet 13600', () => {
      const plan = svc.calculateFullPlan(20000, 13600);
      expect(plan.grossSalary).toBe(20000);
      expect(plan.bankNet).toBe(13600);
      expect(plan.buckets).toEqual({
        fixedCosts: 7480,
        savingsGoals: 1360,
        activeInvestments: 1360,
        guiltFreeSpending: 3740,
      });
      expect(plan.projection).toHaveLength(15);
      expect(plan.projection[0]).toEqual({ year: 1, value: 1455.2 });
      expect(plan.projection[1]).toEqual({ year: 2, value: 1557.06 });
      expect(plan.annualReturnRate).toBe(0.07);
      expect(plan.projectionYears).toBe(15);
    });

    it('returns the default ratios as percentages in the response', () => {
      const plan = svc.calculateFullPlan(20000, 13600);
      expect(plan.fixedCostsPercent).toBe(55);
      expect(plan.guiltFreeSpendingPercent).toBe(27.5);
    });

    it('rejects negative inputs', () => {
      expect(() => svc.calculateFullPlan(-1, 100)).toThrow();
      expect(() => svc.calculateFullPlan(100, -1)).toThrow();
    });
  });

  describe('calculateFullPlan — with percentage overrides', () => {
    const grossSalary = 20000;
    const bankNet = 13600;

    it('applies a custom fixedCostsPercent (50%) and returns correct bucket + ratio', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, { fixedCostsPercent: 50 });
      expect(plan.buckets.fixedCosts).toBe(6800);    // 13600 × 0.50
      expect(plan.fixedCostsPercent).toBe(50);
      // unchanged defaults
      expect(plan.buckets.savingsGoals).toBe(1360);
      expect(plan.buckets.activeInvestments).toBe(1360);
      expect(plan.buckets.guiltFreeSpending).toBe(3740);
      expect(plan.guiltFreeSpendingPercent).toBe(27.5);
    });

    it('applies a custom guiltFreeSpendingPercent (25%) and returns correct bucket + ratio', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, { guiltFreeSpendingPercent: 25 });
      expect(plan.buckets.guiltFreeSpending).toBe(3400); // 13600 × 0.25
      expect(plan.guiltFreeSpendingPercent).toBe(25);
      // unchanged defaults
      expect(plan.buckets.fixedCosts).toBe(7480);
      expect(plan.fixedCostsPercent).toBe(55);
    });

    it('applies both overrides together — balanced at 100% (55+10+10+25=100)', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, {
        fixedCostsPercent: 55,
        guiltFreeSpendingPercent: 25,
      });
      expect(plan.buckets.fixedCosts).toBe(7480);
      expect(plan.buckets.guiltFreeSpending).toBe(3400);
      expect(plan.fixedCostsPercent).toBe(55);
      expect(plan.guiltFreeSpendingPercent).toBe(25);
      const total =
        plan.buckets.fixedCosts +
        plan.buckets.savingsGoals +
        plan.buckets.activeInvestments +
        plan.buckets.guiltFreeSpending;
      expect(total).toBeCloseTo(bankNet * 1.0, 2); // exactly 100%
    });

    it('uses the minimum allowed values (50% fixed, 20% guilt-free)', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, {
        fixedCostsPercent: 50,
        guiltFreeSpendingPercent: 20,
      });
      expect(plan.buckets.fixedCosts).toBe(6800);
      expect(plan.buckets.guiltFreeSpending).toBe(2720); // 13600 × 0.20
      expect(plan.fixedCostsPercent).toBe(50);
      expect(plan.guiltFreeSpendingPercent).toBe(20);
    });

    it('uses the maximum allowed values (60% fixed, 35% guilt-free)', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, {
        fixedCostsPercent: 60,
        guiltFreeSpendingPercent: 35,
      });
      expect(plan.buckets.fixedCosts).toBe(8160);  // 13600 × 0.60
      expect(plan.buckets.guiltFreeSpending).toBe(4760); // 13600 × 0.35
      expect(plan.fixedCostsPercent).toBe(60);
      expect(plan.guiltFreeSpendingPercent).toBe(35);
    });

    it('projection still uses activeInvestments (10% of bankNet) regardless of overrides', () => {
      const plan = svc.calculateFullPlan(grossSalary, bankNet, {
        fixedCostsPercent: 50,
        guiltFreeSpendingPercent: 20,
      });
      // activeInvestments is always 10% → projection seed is always 1360
      expect(plan.projection[0]).toEqual({ year: 1, value: 1455.2 });
      expect(plan.projection).toHaveLength(15);
    });
  });
});
