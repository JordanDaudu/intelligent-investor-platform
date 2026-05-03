import { ApiProperty } from '@nestjs/swagger';
import { BucketBreakdownDto } from './bucket-breakdown.dto';
import { ProjectionPointDto } from './projection-point.dto';

export class FullPlanDto {
  @ApiProperty({ description: 'Gross (pre-tax) monthly salary', example: 20000 })
  grossSalary!: number;

  @ApiProperty({ description: 'Take-home (bank net) monthly pay', example: 13600 })
  bankNet!: number;

  @ApiProperty({ type: () => BucketBreakdownDto, description: 'Monthly spending bucket amounts' })
  buckets!: BucketBreakdownDto;

  @ApiProperty({
    type: () => ProjectionPointDto,
    isArray: true,
    description: '15-year compound wealth projection (one entry per year)',
  })
  projection!: ProjectionPointDto[];

  @ApiProperty({ description: 'Annual return rate used for projection (always 0.07)', example: 0.07 })
  annualReturnRate!: number;

  @ApiProperty({ description: 'Number of projection years (always 15)', example: 15 })
  projectionYears!: number;

  @ApiProperty({ description: 'Fixed Costs ratio actually applied, as a percentage (e.g. 55)', example: 55 })
  fixedCostsPercent!: number;

  @ApiProperty({ description: 'Guilt-Free Spending ratio actually applied, as a percentage (e.g. 27.5)', example: 27.5 })
  guiltFreeSpendingPercent!: number;
}
