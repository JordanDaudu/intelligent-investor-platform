import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES, type Currency } from '../../currencies/currencies.service';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Display name for the financial profile',
    example: 'Alex Garcia',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @Length(1, 120)
  name!: string;

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
      'Override for the Fixed Costs bucket ratio (percentage). Must be 50–60. Defaults to 55 when omitted.',
    example: 55,
    minimum: 50,
    maximum: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(60)
  fixedCostsPercent?: number;

  @ApiPropertyOptional({
    description:
      'Override for the Guilt-Free Spending bucket ratio (percentage). Must be 20–35. Defaults to 27.5 when omitted.',
    example: 27.5,
    minimum: 20,
    maximum: 35,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(35)
  guiltFreeSpendingPercent?: number;

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency code the profile values are recorded in. Defaults to ILS when omitted.',
    example: 'ILS',
    enum: SUPPORTED_CURRENCIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  currency?: Currency;
}
