import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CurrencyProvider,
  DEFAULT_CURRENCY,
  FALLBACK_RATES_IN_ILS,
  SUPPORTED_CURRENCIES,
  useCurrency,
} from '../currency/CurrencyContext';
import { investorApi } from '../api/investorApi';

function Probe() {
  const { currency, setCurrency, format, convert, ratesInIls } = useCurrency();
  return (
    <div>
      <span data-testid="active">{currency}</span>
      <span data-testid="formatted">{format(1234.5)}</span>
      <span data-testid="usd-to-ils">{convert(100, 'USD', 'ILS')}</span>
      <span data-testid="rate-usd">{ratesInIls.USD}</span>
      <button onClick={() => setCurrency('USD')}>To USD</button>
      <button onClick={() => setCurrency('EUR')}>To EUR</button>
      <button onClick={() => setCurrency('GBP')}>To GBP</button>
    </div>
  );
}

describe('CurrencyContext', () => {
  beforeEach(() => {
    vi.spyOn(investorApi, 'currencies').mockResolvedValue({
      supported: ['ILS', 'USD', 'EUR', 'GBP'],
      default: 'ILS',
      ratesInIls: FALLBACK_RATES_IN_ILS,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the four supported currencies and ILS as default', () => {
    expect(SUPPORTED_CURRENCIES).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
    expect(DEFAULT_CURRENCY).toBe('ILS');
  });

  it('defaults active currency to ILS', () => {
    render(
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>,
    );
    expect(screen.getByTestId('active')).toHaveTextContent('ILS');
  });

  it('formats with the active currency symbol', async () => {
    const user = userEvent.setup();
    render(
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>,
    );

    // ILS default
    expect(screen.getByTestId('formatted').textContent).toMatch(/[₪]|ILS/);

    await user.click(screen.getByText('To USD'));
    expect(screen.getByTestId('formatted').textContent).toMatch(/\$/);

    await user.click(screen.getByText('To EUR'));
    expect(screen.getByTestId('formatted').textContent).toMatch(/€/);

    await user.click(screen.getByText('To GBP'));
    expect(screen.getByTestId('formatted').textContent).toMatch(/£/);
  });

  it('convert(100, USD, ILS) returns 370 using the fallback rate table', () => {
    render(
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>,
    );
    expect(Number(screen.getByTestId('usd-to-ils').textContent)).toBeCloseTo(370, 6);
  });

  it('round-trips USD → ILS → USD within float tolerance', () => {
    function RoundTripProbe() {
      const { convert } = useCurrency();
      const ils = convert(100, 'USD', 'ILS');
      const back = convert(ils, 'ILS', 'USD');
      return <span data-testid="round-trip">{back}</span>;
    }
    render(
      <CurrencyProvider>
        <RoundTripProbe />
      </CurrencyProvider>,
    );
    expect(Number(screen.getByTestId('round-trip').textContent)).toBeCloseTo(100, 6);
  });

  it('cross-rate USD → EUR uses ILS as the bridge', () => {
    function CrossProbe() {
      const { convert } = useCurrency();
      return <span data-testid="usd-to-eur">{convert(100, 'USD', 'EUR')}</span>;
    }
    render(
      <CurrencyProvider>
        <CrossProbe />
      </CurrencyProvider>,
    );
    expect(Number(screen.getByTestId('usd-to-eur').textContent)).toBeCloseTo((100 * 3.7) / 4.0, 6);
  });

  it('falls back to hardcoded rates when the /api/currencies request fails', async () => {
    vi.spyOn(investorApi, 'currencies').mockRejectedValue(new Error('network down'));

    render(
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>,
    );
    // Allow the rejected promise's rejection handler to run.
    await act(async () => {
      await Promise.resolve();
    });

    expect(Number(screen.getByTestId('rate-usd').textContent)).toBe(3.7);
    expect(Number(screen.getByTestId('usd-to-ils').textContent)).toBeCloseTo(370, 6);
  });
});
