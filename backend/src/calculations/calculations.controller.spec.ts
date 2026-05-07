import { Test } from '@nestjs/testing';
import { CalculationsController } from './calculations.controller';
import {
  CalculationsService,
  REQUIRED_ANNUAL_RETURN,
  REQUIRED_PROJECTION_YEARS,
} from './calculations.service';

describe('CalculationsController', () => {
  let controller: CalculationsController;
  const service = {
    calculateFullPlan: jest.fn(),
    calculateMonthlyContributionProjection: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CalculationsController],
      providers: [{ provide: CalculationsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(CalculationsController);
  });

  describe('preview', () => {
    it('delegates to calculateFullPlan with overrides forwarded', () => {
      const fakePlan = { grossSalary: 20000, bankNet: 13600 };
      service.calculateFullPlan.mockReturnValue(fakePlan);

      const dto = {
        grossSalary: 20000,
        bankNet: 13600,
        fixedCostsPercent: 50,
        guiltFreeSpendingPercent: 25,
      } as const;

      const result = controller.preview(dto);

      expect(service.calculateFullPlan).toHaveBeenCalledWith(20000, 13600, {
        fixedCostsPercent: 50,
        guiltFreeSpendingPercent: 25,
        currency: undefined,
      });
      expect(result).toBe(fakePlan);
    });

    it('passes undefined override fields through (service applies defaults)', () => {
      service.calculateFullPlan.mockReturnValue({});
      controller.preview({ grossSalary: 100, bankNet: 68 } as never);

      expect(service.calculateFullPlan).toHaveBeenCalledWith(100, 68, {
        fixedCostsPercent: undefined,
        guiltFreeSpendingPercent: undefined,
        currency: undefined,
      });
    });

    it('forwards an explicit currency to the service overrides', () => {
      service.calculateFullPlan.mockReturnValue({});
      controller.preview({
        grossSalary: 100,
        bankNet: 68,
        currency: 'EUR',
      } as never);

      expect(service.calculateFullPlan).toHaveBeenCalledWith(100, 68, {
        fixedCostsPercent: undefined,
        guiltFreeSpendingPercent: undefined,
        currency: 'EUR',
      });
    });
  });

  describe('monthlyContributionProjection', () => {
    it('uses defaults (7% / 15 years) when DTO omits them', () => {
      const projection = [{ year: 1, value: 816 }];
      service.calculateMonthlyContributionProjection.mockReturnValue(projection);

      const result = controller.monthlyContributionProjection({
        monthlyContribution: 68,
      } as never);

      expect(service.calculateMonthlyContributionProjection).toHaveBeenCalledWith(
        68,
        REQUIRED_ANNUAL_RETURN,
        REQUIRED_PROJECTION_YEARS,
      );
      expect(result).toEqual({
        monthlyContribution: 68,
        annualReturnRate: REQUIRED_ANNUAL_RETURN,
        years: REQUIRED_PROJECTION_YEARS,
        projection,
        currency: 'ILS',
      });
    });

    it('forwards explicit annualReturnRate and years from the DTO', () => {
      service.calculateMonthlyContributionProjection.mockReturnValue([]);

      controller.monthlyContributionProjection({
        monthlyContribution: 100,
        annualReturnRate: 0.05,
        years: 10,
      } as never);

      expect(service.calculateMonthlyContributionProjection).toHaveBeenCalledWith(100, 0.05, 10);
    });

    it('echoes the request inputs back in the response envelope', () => {
      service.calculateMonthlyContributionProjection.mockReturnValue([{ year: 1, value: 1200 }]);

      const result = controller.monthlyContributionProjection({
        monthlyContribution: 100,
        annualReturnRate: 0,
        years: 1,
      } as never);

      expect(result.monthlyContribution).toBe(100);
      // 0 must be honored, not coerced to the default 0.07.
      expect(result.annualReturnRate).toBe(0);
      expect(result.years).toBe(1);
    });

    it('echoes an explicit currency back in the response, defaults to ILS otherwise', () => {
      service.calculateMonthlyContributionProjection.mockReturnValue([]);

      const withCurrency = controller.monthlyContributionProjection({
        monthlyContribution: 50,
        currency: 'GBP',
      } as never);
      expect(withCurrency.currency).toBe('GBP');

      const withoutCurrency = controller.monthlyContributionProjection({
        monthlyContribution: 50,
      } as never);
      expect(withoutCurrency.currency).toBe('ILS');
    });
  });
});
