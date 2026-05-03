import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class MonthlyContributionPreviewDto {
  @ApiProperty({
    description: 'Monthly contribution amount in dollars',
    example: 68,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyContribution!: number;

  @ApiPropertyOptional({
    description: 'Annual return rate as a decimal (e.g. 0.07 = 7%). Must be >= 0. Defaults to 0.07.',
    example: 0.07,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  annualReturnRate?: number;

  @ApiPropertyOptional({
    description: 'Projection horizon in whole years (positive integer). Defaults to 15.',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  years?: number;
}
