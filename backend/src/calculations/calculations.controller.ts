import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CalculationsService } from './calculations.service';
import { CalculationPreviewDto } from './dto/calculation-preview.dto';

@Controller('api/calculations')
export class CalculationsController {
  constructor(private readonly calculations: CalculationsService) {}

  /**
   * POST /api/calculations/preview
   * Stateless calculation — does not touch the database.
   * The actual math lives entirely in CalculationsService (clean architecture).
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: CalculationPreviewDto) {
    return this.calculations.calculateFullPlan(dto.grossSalary, dto.bankNet);
  }
}
