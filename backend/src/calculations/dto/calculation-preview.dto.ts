import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CalculationPreviewDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossSalary!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bankNet!: number;
}
