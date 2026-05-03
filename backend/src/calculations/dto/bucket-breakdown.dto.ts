import { ApiProperty } from '@nestjs/swagger';

export class BucketBreakdownDto {
  @ApiProperty({ description: 'Fixed Costs bucket amount (default 55% of bank net)', example: 7480 })
  fixedCosts!: number;

  @ApiProperty({ description: 'Savings Goals bucket amount (10% of bank net)', example: 1360 })
  savingsGoals!: number;

  @ApiProperty({ description: 'Active Investments bucket amount (10% of bank net)', example: 1360 })
  activeInvestments!: number;

  @ApiProperty({ description: 'Guilt-Free Spending bucket amount (default 27.5% of bank net)', example: 3740 })
  guiltFreeSpending!: number;
}
