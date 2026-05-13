import { ApiProperty } from '@nestjs/swagger';
import { ProjectionPointDto } from '../../calculations/dto/projection-point.dto';

export type GoalStatus = 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'AT_RISK';

export class GoalAnalysisResponseDto {
  @ApiProperty({ description: 'Required monthly contribution to reach the target by the deadline', example: 4380 })
  monthlyRequired!: number;

  @ApiProperty({ description: 'Projected portfolio value at the deadline given current trajectory', example: 980000 })
  projectedValueAtDeadline!: number;

  @ApiProperty({ description: 'Completion percentage (0–100, rounded)', example: 35 })
  completionPercentage!: number;

  @ApiProperty({
    description: 'Goal status based on projected value vs target',
    enum: ['ON_TRACK', 'SLIGHTLY_BEHIND', 'AT_RISK'],
    example: 'SLIGHTLY_BEHIND',
  })
  status!: GoalStatus;

  @ApiProperty({
    description: 'ISO date string of the estimated completion date, or null if it cannot be estimated.',
    example: '2034-07-01',
    nullable: true,
  })
  estimatedCompletionDate!: string | null;

  @ApiProperty({
    type: () => ProjectionPointDto,
    isArray: true,
    description: 'Yearly projection from year 1 until the target year (one entry per year).',
  })
  projection!: ProjectionPointDto[];
}
