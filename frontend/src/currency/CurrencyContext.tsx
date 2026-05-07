import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Currency } from '../types/api';
import { investorApi } from '../api/investorApi';

export const SUPPORTED_CURRENCIES: readonly Currency[] = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export const DEFAULT_CURRENCY: Currency = 'ILS';

/**
 * Hardcoded fallback that mirrors the backend's CurrenciesService.
 * Used until the live `/api/currencies` response arrives, and as a
 * safety net if that request fails (offline, backend unreachable, etc.).
 */
export const FALLBACK_RATES_IN_ILS: Record<Currency, number> = {
  ILS: 1.0,
  USD: 3.7,
  EUR: 4.0,
  GBP: 4.7,
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (next: Currency) => void;
  ratesInIls: Record<Currency, number>;
  /** Pure helper: convert `amount` from one currency to another using the cached rates. */
  convert: (amount: number, from: Currency, to: Currency) => number;
  /** Format a number using the active currency, locale en-US. */
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Detect once whether `currencyDisplay: 'narrowSymbol'` produces a usable
 * symbol in this environment. Some jsdom builds yield the ISO code instead;
 * fall back to `'symbol'` if that happens.
 */
function pickCurrencyDisplay(): 'narrowSymbol' | 'symbol' {
  try {
    const sample = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      currencyDisplay: 'narrowSymbol',
    }).format(1);
    if (sample.includes('₪') || sample.includes('$') || sample.includes('€') || sample.includes('£')) {
      return 'narrowSymbol';
    }
    return 'symbol';
  } catch {
    return 'symbol';
  }
}

const CURRENCY_DISPLAY = pickCurrencyDisplay();

function makeFormatter(currency: Currency): Intl.NumberFormat {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: CURRENCY_DISPLAY,
    maximumFractionDigits: 2,
  });
}

export function CurrencyProvider({ children }: PropsWithChildren) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [ratesInIls, setRatesInIls] = useState<Record<Currency, number>>(FALLBACK_RATES_IN_ILS);

  // Pull live rates once on mount; failures fall back silently to the constants above.
  useEffect(() => {
    let cancelled = false;
    void investorApi
      .currencies()
      .then((res) => {
        if (cancelled) return;
        if (res?.ratesInIls) setRatesInIls(res.ratesInIls);
      })
      .catch(() => {
        // Keep the hardcoded fallback. The UI doesn't break offline.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const convert = useCallback(
    (amount: number, from: Currency, to: Currency): number => {
      if (!Number.isFinite(amount)) return 0;
      if (from === to) return amount;
      const ils = amount * ratesInIls[from];
      return ils / ratesInIls[to];
    },
    [ratesInIls],
  );

  const format = useMemo(() => {
    const fmt = makeFormatter(currency);
    return (amount: number) => fmt.format(Number.isFinite(amount) ? amount : 0);
  }, [currency]);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
  }, []);

  const value: CurrencyContextValue = { currency, setCurrency, ratesInIls, convert, format };
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a <CurrencyProvider>.');
  }
  return ctx;
}
