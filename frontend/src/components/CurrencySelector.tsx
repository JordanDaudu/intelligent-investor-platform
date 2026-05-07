import { useCurrency, SUPPORTED_CURRENCIES } from '../currency/CurrencyContext';
import type { Currency } from '../types/api';

const SYMBOL: Record<Currency, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

interface CurrencySelectorProps {
  /** Optional: called after the active currency changes. Receives prev + next so
   *  consumers (e.g. DashboardPage) can re-convert their tracked numeric inputs. */
  onAfterChange?: (prev: Currency, next: Currency) => void;
}

export default function CurrencySelector({ onAfterChange }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const next = e.target.value as Currency;
    if (next === currency) return;
    const prev = currency;
    setCurrency(next);
    onAfterChange?.(prev, next);
  };

  return (
    <label className="currency-selector" data-testid="currency-selector">
      <span className="currency-selector__label">Currency</span>
      <select
        className="currency-selector__select"
        aria-label="Select display currency"
        value={currency}
        onChange={handleChange}
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {SYMBOL[code]} {code}
          </option>
        ))}
      </select>
    </label>
  );
}
