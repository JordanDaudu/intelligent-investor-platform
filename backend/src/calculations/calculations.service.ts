import { Injectable } from '@nestjs/common';

/**
 * Common Sense Spending bucket ratios.
 * All percentages apply to **bank net** (take-home), NOT gross salary.
 */
export const BUCKET_RATIOS = {
  fixedCosts: 0.55,
  savingsGoals: 0.1,
  activeInvestments: 0.1,
  guiltFreeSpending: 0.275,
} as const;

/** Estimate net pay from gross when the user doesn't know their actual net. */
export const BANK_NET_ESTIMATE_RATIO = 0.68;

/** Required projection parameters — DO NOT change for the default chart. */
export const REQUIRED_ANNUAL_RETURN = 0.07;
export const REQUIRED_PROJECTION_YEARS = 15;

export interface BucketBreakdown {
  fixedCosts: number;
  savingsGoals: number;
  activeInvestments: number;
  guiltFreeSpending: number;
}

export interface ProjectionPoint {
  year: number;
  value: number;
}

export interface FullPlan {
  grossSalary: number;
  bankNet: number;
  buckets: BucketBreakdown;
  projection: ProjectionPoint[];
  annualReturnRate: number;
  projectionYears: number;
  /** Actual fixed-costs ratio used, expressed as a percentage (e.g. 55 = 55%). */
  fixedCostsPercent: number;
  /** Actual guilt-free spending ratio used, expressed as a percentage (e.g. 27.5 = 27.5%). */
  guiltFreeSpendingPercent: number;
}

export interface FullPlanOverrides {
  /** Override for Fixed Costs, as a percentage (50–60). */
  fixedCostsPercent?: number;
  /** Override for Guilt-Free Spending, as a percentage (20–35). */
  guiltFreeSpendingPercent?: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class CalculationsService {
  /** Bank Net = Gross Salary × 0.68 */
  estimateBankNet(grossSalary: number): number {
    if (!Number.isFinite(grossSalary) || grossSalary < 0) {
      throw new Error('grossSalary must be a non-negative number');
    }
    return round2(grossSalary * BANK_NET_ESTIMATE_RATIO);
  }

  /** Fixed costs bucket: Bank Net × 55% (default) */
  calculateFixedCosts(bankNet: number): number {
    return this.bucket(bankNet, BUCKET_RATIOS.fixedCosts);
  }

  /** Savings goals bucket: Bank Net × 10% */
  calculateSavingsGoals(bankNet: number): number {
    return this.bucket(bankNet, BUCKET_RATIOS.savingsGoals);
  }

  /** Active investments bucket: Bank Net × 10% */
  calculateActiveInvestments(bankNet: number): number {
    return this.bucket(bankNet, BUCKET_RATIOS.activeInvestments);
  }

  /** Guilt-free spending bucket: Bank Net × 27.5% (default) */
  calculateGuiltFreeSpending(bankNet: number): number {
    return this.bucket(bankNet, BUCKET_RATIOS.guiltFreeSpending);
  }

  /**
   * 15-year compound projection on the active-investments amount.
   * Year 1 value = investment * (1 + r)^1, etc.
   * Defaults are the required 7% / 15 years; overrides power the optional
   * Scenario Lab in the frontend without changing the required default chart.
   */
  calculateWealthProjection(
    investment: number,
    annualReturnRate: number = REQUIRED_ANNUAL_RETURN,
    years: number = REQUIRED_PROJECTION_YEARS,
  ): ProjectionPoint[] {
    if (!Number.isFinite(investment) || investment < 0) {
      throw new Error('investment must be a non-negative number');
    }
    if (!Number.isFinite(annualReturnRate)) {
      throw new Error('annualReturnRate must be a finite number');
    }
    if (!Number.isInteger(years) || years <= 0) {
      throw new Error('years must be a positive integer');
    }

    const out: ProjectionPoint[] = [];
    for (let n = 1; n <= years; n++) {
      const value = investment * Math.pow(1 + annualReturnRate, n);
      out.push({ year: n, value: round2(value) });
    }
    return out;
  }

  /**
   * Calculate the full plan for the required default scenario (7% / 15 years).
   * Used by both the preview endpoint and the persisted profile create flow.
   *
   * @param overrides  Optional ratio overrides from the Budget Allocation Controls.
   *                   `fixedCostsPercent` must be 50–60; `guiltFreeSpendingPercent`
   *                   must be 20–35. Savings Goals (10%) and Active Investments (10%)
   *                   are always fixed.  When an override is omitted the assignment
   *                   midpoint default is used.
   */
  calculateFullPlan(
    grossSalary: number,
    bankNet: number,
    overrides?: FullPlanOverrides,
  ): FullPlan {
    if (!Number.isFinite(grossSalary) || grossSalary < 0) {
      throw new Error('grossSalary must be a non-negative number');
    }
    if (!Number.isFinite(bankNet) || bankNet < 0) {
      throw new Error('bankNet must be a non-negative number');
    }

    const fixedRatio =
      overrides?.fixedCostsPercent != null
        ? overrides.fixedCostsPercent / 100
        : BUCKET_RATIOS.fixedCosts;

    const guiltRatio =
      overrides?.guiltFreeSpendingPercent != null
        ? overrides.guiltFreeSpendingPercent / 100
        : BUCKET_RATIOS.guiltFreeSpending;

    const buckets: BucketBreakdown = {
      fixedCosts: this.bucket(bankNet, fixedRatio),
      savingsGoals: this.calculateSavingsGoals(bankNet),
      activeInvestments: this.calculateActiveInvestments(bankNet),
      guiltFreeSpending: this.bucket(bankNet, guiltRatio),
    };

    return {
      grossSalary: round2(grossSalary),
      bankNet: round2(bankNet),
      buckets,
      projection: this.calculateWealthProjection(buckets.activeInvestments),
      annualReturnRate: REQUIRED_ANNUAL_RETURN,
      projectionYears: REQUIRED_PROJECTION_YEARS,
      fixedCostsPercent: round2(fixedRatio * 100),
      guiltFreeSpendingPercent: round2(guiltRatio * 100),
    };
  }

  private bucket(bankNet: number, ratio: number): number {
    if (!Number.isFinite(bankNet) || bankNet < 0) {
      throw new Error('bankNet must be a non-negative number');
    }
    return round2(bankNet * ratio);
  }
}
