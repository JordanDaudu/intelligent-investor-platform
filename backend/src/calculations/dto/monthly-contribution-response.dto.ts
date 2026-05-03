import { ApiProperty } from '@nestjs/swagger';
import { ProjectionPointDto } from './projection-point.dto';

export class MonthlyContributionResponseDto {
  @ApiProperty({
    description: 'Monthly contribution amount used in the calculation',
    example: 68,
  })
  monthlyContribution!: number;

  @ApiProperty({
    description: 'Annual return rate used (decimal, e.g. 0.07 = 7%)',
    example: 0.07,
  })
  annualReturnRate!: number;

  @ApiProperty({
    description: 'Number of years in the projection',
    example: 15,
  })
  years!: number;

  @ApiProperty({
    type: () => [ProjectionPointDto],
    description: 'Yearly projection data points (one per year)',
  })
  projection!: ProjectionPointDto[];
}
