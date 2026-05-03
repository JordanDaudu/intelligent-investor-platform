import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CalculationPreviewDto {
  @ApiProperty({
    description: 'Monthly gross (pre-tax) salary',
    example: 20000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossSalary!: number;

  @ApiProperty({
    description: 'Monthly take-home (bank net) pay after tax and deductions',
    example: 13600,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bankNet!: number;

  @ApiPropertyOptional({
    description:
      'Override for the Fixed Costs bucket ratio (percentage, e.g. 55 = 55%). Must be 50–60. Defaults to 55 when omitted.',
    example: 55,
    minimum: 50,
    maximum: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(50)
  @Max(60)
  fixedCostsPercent?: number;

  @ApiPropertyOptional({
    description:
      'Override for the Guilt-Free Spending bucket ratio (percentage, e.g. 25 = 25%). Must be 20–35. Defaults to 27.5 when omitted.',
    example: 27.5,
    minimum: 20,
    maximum: 35,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(35)
  guiltFreeSpendingPercent?: number;
}
