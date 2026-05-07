import { Test } from '@nestjs/testing';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

describe('CurrenciesController', () => {
  let controller: CurrenciesController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CurrenciesController],
      providers: [CurrenciesService],
    }).compile();
    controller = moduleRef.get(CurrenciesController);
  });

  it('returns the supported currencies, default, and rate table', () => {
    const result = controller.list();
    expect(result.supported).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
    expect(result.default).toBe('ILS');
    expect(result.ratesInIls).toEqual({ ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 });
  });

  it('returns a fresh copy of supported (caller cannot mutate the service constant)', () => {
    const result = controller.list();
    result.supported.push('JPY');
    const second = controller.list();
    expect(second.supported).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
  });
});
