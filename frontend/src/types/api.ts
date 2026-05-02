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

export interface CalculationPreview {
  grossSalary: number;
  bankNet: number;
  buckets: BucketBreakdown;
  projection: ProjectionPoint[];
  annualReturnRate: number;
  projectionYears: number;
  /** Fixed Costs ratio used, as a percentage (e.g. 55 = 55%). */
  fixedCostsPercent: number;
  /** Guilt-Free Spending ratio used, as a percentage (e.g. 27.5 = 27.5%). */
  guiltFreeSpendingPercent: number;
}

export interface SpendingPlan {
  fixedCosts: number;
  savingsGoals: number;
  activeInvestments: number;
  guiltFreeSpending: number;
  annualReturnRate: number;
  projectionYears: number;
  projectionData: ProjectionPoint[];
}

export interface FinancialProfile {
  id: string;
  name: string;
  grossSalary: number;
  bankNet: number;
  fixedCostsPercent: number | null;
  guiltFreeSpendingPercent: number | null;
  createdAt: string;
  updatedAt: string;
  spendingPlan: SpendingPlan | null;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
}
