import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES, type Currency } from '../../currencies/currencies.service';

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

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency code the contribution amount is expressed in. Echoed back in the response. Defaults to ILS.',
    example: 'ILS',
    enum: SUPPORTED_CURRENCIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  currency?: Currency;
}
