import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurrencySelector from '../components/CurrencySelector';
import { CurrencyProvider, FALLBACK_RATES_IN_ILS, useCurrency } from '../currency/CurrencyContext';
import { investorApi } from '../api/investorApi';

describe('CurrencySelector', () => {
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

  it('renders four options and defaults to ILS', () => {
    render(
      <CurrencyProvider>
        <CurrencySelector />
      </CurrencyProvider>,
    );

    const select = screen.getByLabelText(/Select display currency/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('ILS');

    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
  });

  it('changing the dropdown updates the active currency', async () => {
    function Active() {
      const { currency } = useCurrency();
      return <span data-testid="active">{currency}</span>;
    }

    const user = userEvent.setup();
    render(
      <CurrencyProvider>
        <CurrencySelector />
        <Active />
      </CurrencyProvider>,
    );

    await user.selectOptions(screen.getByLabelText(/Select display currency/i), 'USD');
    expect(screen.getByTestId('active')).toHaveTextContent('USD');
  });

  it('invokes onAfterChange with previous and next codes', async () => {
    const onAfterChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CurrencyProvider>
        <CurrencySelector onAfterChange={onAfterChange} />
      </CurrencyProvider>,
    );

    await user.selectOptions(screen.getByLabelText(/Select display currency/i), 'EUR');
    expect(onAfterChange).toHaveBeenCalledWith('ILS', 'EUR');
  });

  it('does not invoke onAfterChange when the same currency is reselected', async () => {
    const onAfterChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CurrencyProvider>
        <CurrencySelector onAfterChange={onAfterChange} />
      </CurrencyProvider>,
    );

    await user.selectOptions(screen.getByLabelText(/Select display currency/i), 'ILS');
    expect(onAfterChange).not.toHaveBeenCalled();
  });
});
