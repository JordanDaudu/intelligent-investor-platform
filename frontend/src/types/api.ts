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
  createdAt: string;
  updatedAt: string;
  spendingPlan: SpendingPlan | null;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
}
