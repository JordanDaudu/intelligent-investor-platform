import type { ProjectionPoint } from '../../calculations/calculations.service';

export interface SpendingPlanResponse {
  fixedCosts: number;
  savingsGoals: number;
  activeInvestments: number;
  guiltFreeSpending: number;
  annualReturnRate: number;
  projectionYears: number;
  projectionData: ProjectionPoint[];
}

export interface ProfileResponseDto {
  id: string;
  name: string;
  grossSalary: number;
  bankNet: number;
  createdAt: string;
  updatedAt: string;
  spendingPlan: SpendingPlanResponse | null;
}
