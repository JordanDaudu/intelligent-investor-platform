import { ApiProperty } from '@nestjs/swagger';

export class ProjectionPointDto {
  @ApiProperty({ description: 'Year number (1–15)', example: 1 })
  year!: number;

  @ApiProperty({ description: 'Projected portfolio value at this year', example: 14696 })
  value!: number;
}
