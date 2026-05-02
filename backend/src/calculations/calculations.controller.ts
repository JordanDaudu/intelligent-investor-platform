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
   *
   * Optional body fields `fixedCostsPercent` and `guiltFreeSpendingPercent` allow
   * the Budget Allocation Controls in the frontend to request custom bucket ratios.
   * Omitting them keeps the assignment-default behaviour (55% / 27.5%).
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: CalculationPreviewDto) {
    return this.calculations.calculateFullPlan(dto.grossSalary, dto.bankNet, {
      fixedCostsPercent: dto.fixedCostsPercent,
      guiltFreeSpendingPercent: dto.guiltFreeSpendingPercent,
    });
  }
}
