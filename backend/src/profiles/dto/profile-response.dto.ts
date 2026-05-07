import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpendingPlanResponseDto } from './spending-plan-response.dto';

export class ProfileResponseDto {
  @ApiProperty({ description: 'Unique profile identifier (UUID v4)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ description: "User's display name for this financial profile", example: 'Alex Garcia' })
  name!: string;

  @ApiProperty({ description: 'Monthly gross (pre-tax) salary', example: 20000 })
  grossSalary!: number;

  @ApiProperty({ description: 'Monthly take-home (bank net) pay after tax and deductions', example: 13600 })
  bankNet!: number;

  @ApiPropertyOptional({
    description: 'Fixed Costs bucket override stored with this profile, as a percentage (e.g. 55 = 55%). Null means the default of 55% was used.',
    example: 55,
    nullable: true,
  })
  fixedCostsPercent!: number | null;

  @ApiPropertyOptional({
    description: 'Guilt-Free Spending bucket override stored with this profile, as a percentage (e.g. 27.5 = 27.5%). Null means the default of 27.5% was used.',
    example: 27.5,
    nullable: true,
  })
  guiltFreeSpendingPercent!: number | null;

  @ApiProperty({
    description: 'ISO 4217 currency code the profile values are stored in.',
    example: 'ILS',
    enum: ['ILS', 'USD', 'EUR', 'GBP'],
  })
  currency!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of when this profile was created', example: '2026-05-03T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of when this profile was last updated', example: '2026-05-03T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({
    type: () => SpendingPlanResponseDto,
    nullable: true,
    description: 'Pre-computed spending plan for this profile, including bucket amounts and 15-year wealth projection. Null if the plan has not yet been generated.',
  })
  spendingPlan!: SpendingPlanResponseDto | null;
}
