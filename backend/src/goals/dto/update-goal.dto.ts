import { ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * Partial update of a FinancialGoal. All fields optional. `profileId` is intentionally
 * excluded — a goal stays attached to its original profile.
 */
export class UpdateGoalDto {
  @ApiPropertyOptional({
    description: 'Updated title',
    example: 'Buy Penthouse',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated category',
    enum: GoalCategory,
    example: GoalCategory.APARTMENT,
  })
  @IsOptional()
  @IsEnum(GoalCategory)
  category?: GoalCategory;

  @ApiPropertyOptional({
    description: 'Updated target amount (must be > 0)',
    example: 1500000,
    minimum: 0.01,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetAmount?: number;

  @ApiPropertyOptional({
    description: 'Updated current amount (must be >= 0)',
    example: 300000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({
    description: 'Updated ISO 8601 deadline. Must be in the future when supplied.',
    example: '2035-01-01',
  })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Updated expected annual return as a decimal (0–1).',
    example: 0.08,
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
