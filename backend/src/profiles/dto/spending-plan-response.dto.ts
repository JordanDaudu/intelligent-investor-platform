import { ApiProperty } from '@nestjs/swagger';
import { ProjectionPointDto } from '../../calculations/dto/projection-point.dto';

export class SpendingPlanResponseDto {
  @ApiProperty({ description: 'Fixed Costs bucket amount (default 55% of bank net)', example: 7480 })
  fixedCosts!: number;

  @ApiProperty({ description: 'Savings Goals bucket amount (10% of bank net)', example: 1360 })
  savingsGoals!: number;

  @ApiProperty({ description: 'Active Investments bucket amount (10% of bank net)', example: 1360 })
  activeInvestments!: number;

  @ApiProperty({ description: 'Guilt-Free Spending bucket amount (default 27.5% of bank net)', example: 3740 })
  guiltFreeSpending!: number;

  @ApiProperty({ description: 'Annual return rate used for the wealth projection (always 0.07)', example: 0.07 })
  annualReturnRate!: number;

  @ApiProperty({ description: 'Number of projection years (always 15)', example: 15 })
  projectionYears!: number;

  @ApiProperty({
    type: () => ProjectionPointDto,
    isArray: true,
    description: '15-year compound wealth projection — one entry per year based on the Active Investments amount.',
  })
  projectionData!: ProjectionPointDto[];
}
