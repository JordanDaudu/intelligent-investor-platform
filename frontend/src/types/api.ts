export type Currency = 'ILS' | 'USD' | 'EUR' | 'GBP';

export interface CurrenciesResponse {
  supported: Currency[];
  default: Currency;
  ratesInIls: Record<Currency, number>;
}

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
  /** Currency the input values were expressed in (echoed from request). */
  currency: Currency;
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
  currency: Currency;
  createdAt: string;
  updatedAt: string;
  spendingPlan: SpendingPlan | null;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
}

export interface MonthlyContributionProjectionRequest {
  monthlyContribution: number;
  annualReturnRate?: number;
  years?: number;
  currency?: Currency;
}

export interface MonthlyContributionProjectionResponse {
  monthlyContribution: number;
  annualReturnRate: number;
  years: number;
  projection: ProjectionPoint[];
  currency: Currency;
}

export type GoalCategory =
  | 'EMERGENCY_FUND'
  | 'RETIREMENT'
  | 'APARTMENT'
  | 'CAR'
  | 'VACATION'
  | 'EDUCATION'
  | 'CUSTOM';

export type GoalStatus = 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'AT_RISK';

export interface FinancialGoal {
  id: string;
  profileId: string;
  title: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  expectedReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProjectionPoint {
  year: number;
  value: number;
}

export interface GoalAnalysis {
  monthlyRequired: number;
  projectedValueAtDeadline: number;
  completionPercentage: number;
  status: GoalStatus;
  estimatedCompletionDate: string | null;
  projection: GoalProjectionPoint[];
}

export interface CreateGoalRequest {
  profileId: string;
  title: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  expectedReturn?: number;
}
