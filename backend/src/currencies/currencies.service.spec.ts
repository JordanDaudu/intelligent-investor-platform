import { BadRequestException } from '@nestjs/common';
import {
  CurrenciesService,
  DEFAULT_CURRENCY,
  RATES_IN_ILS,
  SUPPORTED_CURRENCIES,
} from './currencies.service';

describe('CurrenciesService', () => {
  let svc: CurrenciesService;

  beforeEach(() => {
    svc = new CurrenciesService();
  });

  describe('constants', () => {
    it('exposes exactly the four expected currencies', () => {
      expect(SUPPORTED_CURRENCIES).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
      expect(svc.supported).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
    });

    it('uses ILS as the default', () => {
      expect(DEFAULT_CURRENCY).toBe('ILS');
      expect(svc.default).toBe('ILS');
    });

    it('pins ILS to a rate of 1', () => {
      expect(RATES_IN_ILS.ILS).toBe(1);
    });

    it('pins the foreign rates to the documented values', () => {
      // If a rate changes, this is an intentional design decision — update both
      // the constant and this test together.
      expect(RATES_IN_ILS.USD).toBe(3.7);
      expect(RATES_IN_ILS.EUR).toBe(4.0);
      expect(RATES_IN_ILS.GBP).toBe(4.7);
    });
  });

  describe('isSupported', () => {
    it('accepts every supported code', () => {
      for (const code of SUPPORTED_CURRENCIES) {
        expect(svc.isSupported(code)).toBe(true);
      }
    });

    it('rejects unknown codes', () => {
      expect(svc.isSupported('JPY')).toBe(false);
      expect(svc.isSupported('')).toBe(false);
      expect(svc.isSupported('ils')).toBe(false); // case-sensitive
    });
  });

  describe('convert', () => {
    it('returns the input unchanged when from === to', () => {
      expect(svc.convert(123.45, 'USD', 'USD')).toBe(123.45);
      expect(svc.convert(0, 'ILS', 'ILS')).toBe(0);
    });

    it('USD → ILS multiplies by the USD rate', () => {
      expect(svc.convert(100, 'USD', 'ILS')).toBe(370);
    });

    it('ILS → USD divides by the USD rate', () => {
      expect(svc.convert(370, 'ILS', 'USD')).toBeCloseTo(100, 6);
    });

    it('round-trips USD → ILS → USD within float tolerance', () => {
      const start = 100;
      const ils = svc.convert(start, 'USD', 'ILS');
      const back = svc.convert(ils, 'ILS', 'USD');
      expect(back).toBeCloseTo(start, 6);
    });

    it('cross-rate USD → EUR equals USD-ILS-rate over EUR-ILS-rate', () => {
      // 100 USD * 3.7 / 4.0 = 92.5 EUR
      expect(svc.convert(100, 'USD', 'EUR')).toBeCloseTo((100 * 3.7) / 4.0, 6);
    });

    it('throws BadRequestException on unsupported source currency', () => {
      expect(() => svc.convert(1, 'JPY' as never, 'ILS')).toThrow(BadRequestException);
    });

    it('throws BadRequestException on unsupported target currency', () => {
      expect(() => svc.convert(1, 'ILS', 'JPY' as never)).toThrow(BadRequestException);
    });

    it('throws on non-finite amounts', () => {
      expect(() => svc.convert(Number.NaN, 'ILS', 'USD')).toThrow(BadRequestException);
      expect(() => svc.convert(Number.POSITIVE_INFINITY, 'ILS', 'USD')).toThrow(BadRequestException);
    });
  });
});
