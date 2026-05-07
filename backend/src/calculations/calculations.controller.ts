import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { CalculationsService, REQUIRED_ANNUAL_RETURN, REQUIRED_PROJECTION_YEARS } from './calculations.service';
import { DEFAULT_CURRENCY } from '../currencies/currencies.service';
import { CalculationPreviewDto } from './dto/calculation-preview.dto';
import { FullPlanDto } from './dto/full-plan.dto';
import { BucketBreakdownDto } from './dto/bucket-breakdown.dto';
import { ProjectionPointDto } from './dto/projection-point.dto';
import { MonthlyContributionPreviewDto } from './dto/monthly-contribution-preview.dto';
import { MonthlyContributionResponseDto } from './dto/monthly-contribution-response.dto';

@ApiExtraModels(FullPlanDto, BucketBreakdownDto, ProjectionPointDto, MonthlyContributionResponseDto)
@ApiTags('calculations')
@Controller('api/calculations')
export class CalculationsController {
  constructor(private readonly calculations: CalculationsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview a spending-bucket calculation (stateless)',
    description:
      'Runs the Common Sense Spending bucket math and 15-year projection without persisting anything. ' +
      'Optional body fields `fixedCostsPercent` and `guiltFreeSpendingPercent` override the default ratios (55% / 27.5%).',
  })
  @ApiOkResponse({ type: FullPlanDto, description: 'Calculation result including bucket amounts and 15-year projection data.' })
  @ApiResponse({ status: 400, description: 'Validation error — check request body fields.' })
  preview(@Body() dto: CalculationPreviewDto) {
    return this.calculations.calculateFullPlan(dto.grossSalary, dto.bankNet, {
      fixedCostsPercent: dto.fixedCostsPercent,
      guiltFreeSpendingPercent: dto.guiltFreeSpendingPercent,
      currency: dto.currency,
    });
  }

  @Post('monthly-contribution-projection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extra-credit: future value of recurring monthly contributions (stateless)',
    description:
      'Calculates the projected portfolio value when the same amount is contributed every month. ' +
      'Uses the future-value-of-annuity formula: FV = C × ((1+r)^n − 1) / r. ' +
      'This is separate from the required assignment projection (single-amount compound).',
  })
  @ApiOkResponse({ type: MonthlyContributionResponseDto, description: 'Projection data with one point per year.' })
  @ApiResponse({ status: 400, description: 'Validation error — check request body fields.' })
  monthlyContributionProjection(@Body() dto: MonthlyContributionPreviewDto): MonthlyContributionResponseDto {
    const annualReturnRate = dto.annualReturnRate ?? REQUIRED_ANNUAL_RETURN;
    const years = dto.years ?? REQUIRED_PROJECTION_YEARS;
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    const projection = this.calculations.calculateMonthlyContributionProjection(
      dto.monthlyContribution,
      annualReturnRate,
      years,
    );
    return { monthlyContribution: dto.monthlyContribution, annualReturnRate, years, projection, currency };
  }
}
