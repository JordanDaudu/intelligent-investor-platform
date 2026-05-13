import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { GoalCategory } from '@prisma/client';

export class CreateGoalDto {
  @ApiProperty({
    description: 'UUID of the FinancialProfile this goal belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @Length(1, 64)
  profileId!: string;

  @ApiProperty({
    description: 'Human-readable title for the goal',
    example: 'Buy Apartment',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @Length(1, 120)
  title!: string;

  @ApiProperty({
    description: 'Goal category bucket',
    enum: GoalCategory,
    example: GoalCategory.APARTMENT,
  })
  @IsEnum(GoalCategory)
  category!: GoalCategory;

  @ApiProperty({
    description: 'Target amount the user is saving toward (must be > 0)',
    example: 1000000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetAmount!: number;

  @ApiProperty({
    description: 'Amount already saved (must be >= 0)',
    example: 250000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAmount!: number;

  @ApiProperty({
    description: 'ISO 8601 date when the goal must be reached. Must be in the future.',
    example: '2034-07-01',
  })
  @IsDateString()
  targetDate!: string;

  @ApiPropertyOptional({
    description:
      'Expected annual return as a decimal (e.g. 0.07 = 7%). Must be in [0, 1]. Defaults to 0.07.',
    example: 0.07,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  expectedReturn?: number;
}
