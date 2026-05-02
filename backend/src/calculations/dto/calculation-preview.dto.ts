import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CalculationPreviewDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossSalary!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bankNet!: number;

  /**
   * Optional override for the Fixed Costs bucket ratio (percentage, e.g. 55 = 55%).
   * Must be within the assignment-defined range of 50%–60%.
   * Defaults to 55 when omitted.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(50)
  @Max(60)
  fixedCostsPercent?: number;

  /**
   * Optional override for the Guilt-Free Spending bucket ratio (percentage, e.g. 25 = 25%).
   * Must be within the assignment-defined range of 20%–35%.
   * Defaults to 27.5 when omitted.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(35)
  guiltFreeSpendingPercent?: number;
}
