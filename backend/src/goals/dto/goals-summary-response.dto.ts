import { ApiProperty } from '@nestjs/swagger';
import type { GoalStatus } from './goal-analysis-response.dto';

export class GoalStatusCountsDto {
  @ApiProperty({ description: 'Count of goals projected to meet or exceed their target', example: 1 })
  ON_TRACK!: number;

  @ApiProperty({ description: 'Count of goals projected to miss target by < 15%', example: 2 })
  SLIGHTLY_BEHIND!: number;

  @ApiProperty({ description: 'Count of goals projected to miss target by >= 15%', example: 1 })
  AT_RISK!: number;
}

export class GoalsSummaryResponseDto {
  @ApiProperty({ description: 'Total number of goals on the profile', example: 4 })
  goalCount!: number;

  @ApiProperty({ description: 'Sum of every goal target amount', example: 1250000 })
  totalTargetAmount!: number;

  @ApiProperty({ description: 'Sum of every goal currentAmount', example: 312000 })
  totalCurrentAmount!: number;

  @ApiProperty({
    description: 'Sum of every goal\'s required monthly contribution at the current trajectory',
    example: 9120,
  })
  totalMonthlyRequired!: number;

  @ApiProperty({
    description: 'Aggregate completion percentage across all goals (rounded, 0–100). 0 when no goals.',
    example: 24,
  })
  overallCompletionPercentage!: number;

  @ApiProperty({ type: () => GoalStatusCountsDto, description: 'Counts of goals by status bucket.' })
  statusCounts!: Record<GoalStatus, number>;
}
