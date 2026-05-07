import { BadRequestException, Injectable } from '@nestjs/common';

/** Supported ISO 4217 currency codes for the dashboard. */
export const SUPPORTED_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Default currency used when none is supplied. ILS = Israeli Shekel. */
export const DEFAULT_CURRENCY: Currency = 'ILS';

/**
 * Static rate table: how many ILS one unit of the foreign currency is worth.
 * Hardcoded by design — this project doesn't reach for a live FX API.
 *
 * Tests pin these values; if rates change, update the constants and the spec.
 */
export const RATES_IN_ILS: Record<Currency, number> = {
  ILS: 1.0,
  USD: 3.7,
  EUR: 4.0,
  GBP: 4.7,
};

@Injectable()
export class CurrenciesService {
  readonly supported = SUPPORTED_CURRENCIES;
  readonly default = DEFAULT_CURRENCY;
  readonly ratesInIls = RATES_IN_ILS;

  isSupported(code: string): code is Currency {
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
  }

  /**
   * Convert `amount` from one supported currency to another using the ILS-anchored rate table.
   * Same-currency conversions short-circuit to the input value (no float drift).
   */
  convert(amount: number, from: Currency, to: Currency): number {
    if (!this.isSupported(from)) {
      throw new BadRequestException(`Unsupported source currency: ${from}`);
    }
    if (!this.isSupported(to)) {
      throw new BadRequestException(`Unsupported target currency: ${to}`);
    }
    if (!Number.isFinite(amount)) {
      throw new BadRequestException('amount must be a finite number');
    }
    if (from === to) return amount;
    const ilsValue = amount * RATES_IN_ILS[from];
    return ilsValue / RATES_IN_ILS[to];
  }
}
