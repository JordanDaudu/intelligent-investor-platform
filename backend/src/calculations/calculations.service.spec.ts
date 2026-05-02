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

  describe('calculateFullPlan', () => {
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

    it('rejects negative inputs', () => {
      expect(() => svc.calculateFullPlan(-1, 100)).toThrow();
      expect(() => svc.calculateFullPlan(100, -1)).toThrow();
    });
  });
});
