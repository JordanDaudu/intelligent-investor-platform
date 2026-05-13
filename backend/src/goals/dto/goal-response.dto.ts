import { ApiProperty } from '@nestjs/swagger';
import { GoalCategory } from '@prisma/client';

export class GoalResponseDto {
  @ApiProperty({ description: 'Unique goal identifier (UUID v4)', example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' })
  id!: string;

  @ApiProperty({ description: 'UUID of the FinancialProfile this goal belongs to', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  profileId!: string;

  @ApiProperty({ description: 'Human-readable title', example: 'Buy Apartment' })
  title!: string;

  @ApiProperty({ description: 'Goal category bucket', enum: GoalCategory, example: GoalCategory.APARTMENT })
  category!: GoalCategory;

  @ApiProperty({ description: 'Target amount the user is saving toward', example: 1000000 })
  targetAmount!: number;

  @ApiProperty({ description: 'Amount already saved', example: 250000 })
  currentAmount!: number;

  @ApiProperty({ description: 'ISO 8601 timestamp of the deadline', example: '2034-07-01T00:00:00.000Z' })
  targetDate!: string;

  @ApiProperty({ description: 'Expected annual return as a decimal (e.g. 0.07 = 7%)', example: 0.07 })
  expectedReturn!: number;

  @ApiProperty({ description: 'ISO 8601 timestamp of when the goal was created', example: '2026-05-07T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of when the goal was last updated', example: '2026-05-07T10:00:00.000Z' })
  updatedAt!: string;
}
