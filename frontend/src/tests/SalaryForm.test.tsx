import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/DashboardPage';
import { investorApi } from '../api/investorApi';
import type { CalculationPreview, Currency } from '../types/api';
import type { PreviewInput } from '../api/investorApi';
import { CurrencyProvider, FALLBACK_RATES_IN_ILS } from '../currency/CurrencyContext';
import CurrencySelector from '../components/CurrencySelector';

function renderApp() {
  // Mirror the production tree well enough for these tests:
  // CurrencyProvider wraps both the selector (normally in <Layout>) and
  // the DashboardPage so context values are shared between them.
  return render(
    <CurrencyProvider>
      <CurrencySelector />
      <DashboardPage />
    </CurrencyProvider>,
  );
}

/** Pulls the currency symbol jsdom is using for a given code via Intl.NumberFormat,
 *  so assertions don't have to assume narrowSymbol vs. fallback. */
function symbolFor(code: Currency): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  }).format(0);
  // Strip digits, decimal separators, whitespace — what's left is the symbol/prefix.
  return formatted.replace(/[\d.,\s ]/g, '');
}

function makePreview(
  bankNet: number,
  grossSalary = 0,
  fixedCostsPercent = 55,
  guiltFreeSpendingPercent = 27.5,
  currency: Currency = 'ILS',
): CalculationPreview {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    grossSalary,
    bankNet,
    buckets: {
      fixedCosts: r(bankNet * (fixedCostsPercent / 100)),
      savingsGoals: r(bankNet * 0.1),
      activeInvestments: r(bankNet * 0.1),
      guiltFreeSpending: r(bankNet * (guiltFreeSpendingPercent / 100)),
    },
    projection: [],
    annualReturnRate: 0.07,
    projectionYears: 15,
    fixedCostsPercent,
    guiltFreeSpendingPercent,
    currency,
  };
}

function setupMocks() {
  vi.spyOn(investorApi, 'listProfiles').mockResolvedValue([]);
  vi.spyOn(investorApi, 'health').mockResolvedValue({
    status: 'ok',
    database: 'connected',
  });
  vi.spyOn(investorApi, 'currencies').mockResolvedValue({
    supported: ['ILS', 'USD', 'EUR', 'GBP'],
    default: 'ILS',
    ratesInIls: FALLBACK_RATES_IN_ILS,
  });
  vi.spyOn(investorApi, 'preview').mockImplementation(
    ({
      grossSalary,
      bankNet,
      fixedCostsPercent = 55,
      guiltFreeSpendingPercent = 27.5,
      currency = 'ILS',
    }: PreviewInput) =>
      Promise.resolve(
        makePreview(bankNet, grossSalary, fixedCostsPercent, guiltFreeSpendingPercent, currency),
      ),
  );
  vi.spyOn(investorApi, 'monthlyContributionProjection').mockImplementation(({ monthlyContribution, annualReturnRate = 0.07, years = 15, currency = 'ILS' }) =>
    Promise.resolve({
      monthlyContribution,
      annualReturnRate,
      years,
      projection: Array.from({ length: years }, (_, i) => ({ year: i + 1, value: (i + 1) * 1000 })),
      currency,
    }),
  );
}

describe('Salary form ↔ bucket cards', () => {
  beforeEach(setupMocks);

  it('updates the four bucket amounts when the user enters a bank-net value', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() => {
      const ils = symbolFor('ILS');
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain('7,480.00');
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain(ils);
      expect(screen.getByTestId('bucket-savings-amount').textContent).toContain('1,360.00');
      expect(screen.getByTestId('bucket-investments-amount').textContent).toContain('1,360.00');
      expect(screen.getByTestId('bucket-guilt-amount').textContent).toContain('3,740.00');
    });
  });

  it('Estimate button fills bank net as gross × 0.68', async () => {
    const user = userEvent.setup();
    renderApp();

    const grossInput = screen.getByLabelText(/Gross monthly salary/i);
    await user.clear(grossInput);
    await user.type(grossInput, '20000');

    await user.click(screen.getByRole('button', { name: /Estimate/i }));

    const netInput = screen.getByLabelText(/Bank net/i) as HTMLInputElement;
    expect(netInput.value).toBe('13600');

    await waitFor(() => {
      const ils = symbolFor('ILS');
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain('7,480.00');
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain(ils);
    });
  });
});

describe('Currency selector', () => {
  beforeEach(setupMocks);

  it('defaults to ILS and shows the ILS symbol on bucket cards', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    const ils = symbolFor('ILS');
    await waitFor(() => {
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain(ils);
    });

    const select = screen.getByLabelText(/Select display currency/i) as HTMLSelectElement;
    expect(select.value).toBe('ILS');
  });

  it('switching to USD converts typed bank-net values and reformats with $', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i) as HTMLInputElement;
    await user.clear(netInput);
    await user.type(netInput, '13600');

    // Confirm baseline ILS values render before switching.
    await waitFor(() => {
      expect(screen.getByTestId('bucket-fixed-amount').textContent).toContain('7,480.00');
    });

    await user.selectOptions(screen.getByLabelText(/Select display currency/i), 'USD');

    // 13600 ILS / 3.7 ≈ 3675.68 USD; fixed costs (55%) ≈ 2021.62
    await waitFor(() => {
      expect(netInput.value).toBe('3675.68');
    });
    await waitFor(() => {
      const text = screen.getByTestId('bucket-fixed-amount').textContent ?? '';
      expect(text).toMatch(/\$/);
      expect(text).toContain('2,021.62');
    });
  });
});

describe('Investment Projection section', () => {
  beforeEach(setupMocks);

  it('renders the Investment Projection section', () => {
    renderApp();
    expect(screen.getByTestId('investment-projection')).toBeInTheDocument();
    expect(screen.getByText('Investment Projection')).toBeInTheDocument();
  });

  it('shows "Assignment Default" badge at default settings (7%, 15 years)', () => {
    renderApp();
    expect(screen.getByTestId('projection-mode-badge')).toHaveTextContent('Assignment Default');
  });

  it('defaults the annual return display to 7.0%', () => {
    renderApp();
    expect(screen.getByTestId('return-rate-display')).toHaveTextContent('7.0%');
  });

  it('defaults the time horizon display to 15 years', () => {
    renderApp();
    expect(screen.getByTestId('years-display')).toHaveTextContent('15 years');
  });

  it('changes badge to "Scenario Mode" when annual return slider is moved', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderApp();

    // Scope to the investment-projection section to avoid matching the
    // MonthlyContributionProjection's "Monthly contribution annual return rate" slider
    const projectionSection = screen.getByTestId('investment-projection');
    const returnSlider = projectionSection.querySelector('input[aria-label="Annual return rate"]') as HTMLInputElement;
    expect(returnSlider).not.toBeNull();

    fireEvent.change(returnSlider, { target: { value: '0.05' } });

    await waitFor(() =>
      expect(screen.getByTestId('projection-mode-badge')).toHaveTextContent('Scenario Mode'),
    );
  });

  it('shows "Reset to assignment default" button in Scenario Mode and hides it in default mode', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderApp();

    // In default mode the reset button should NOT be visible
    expect(screen.queryByTestId('reset-to-default')).not.toBeInTheDocument();

    // Scope to the investment-projection section to avoid matching the monthly slider
    const projectionSection = screen.getByTestId('investment-projection');
    const returnSlider = projectionSection.querySelector('input[aria-label="Annual return rate"]') as HTMLInputElement;
    fireEvent.change(returnSlider, { target: { value: '0.10' } });

    await waitFor(() =>
      expect(screen.getByTestId('reset-to-default')).toBeInTheDocument(),
    );

    // Clicking reset should go back to assignment default
    await userEvent.click(screen.getByTestId('reset-to-default'));

    await waitFor(() =>
      expect(screen.getByTestId('projection-mode-badge')).toHaveTextContent('Assignment Default'),
    );
  });
});

describe('Monthly Contribution Projection section', () => {
  beforeEach(setupMocks);

  it('entering bank net 680 shows Active Investments = 68.00 (default ILS)', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '680');

    await waitFor(() => {
      expect(screen.getByTestId('bucket-investments-amount').textContent).toContain('68.00');
    });
  });

  it('Monthly Contribution Projection section appears in the page', async () => {
    renderApp();
    expect(screen.getByTestId('monthly-contribution-projection')).toBeInTheDocument();
    expect(screen.getByText('Monthly Contribution Projection')).toBeInTheDocument();
    expect(screen.getByText('Extra Credit')).toBeInTheDocument();
  });

  it('Monthly Contribution Projection has Annual return and Time horizon sliders', () => {
    renderApp();
    expect(
      screen.getByLabelText(/Monthly contribution annual return rate/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly contribution years/i)).toBeInTheDocument();
  });

  it('Investment Projection and Monthly Contribution Projection are separate sections', () => {
    renderApp();
    expect(screen.getByTestId('investment-projection')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-contribution-projection')).toBeInTheDocument();
  });
});

describe('Allocation Controls', () => {
  beforeEach(setupMocks);

  it('shows 102.5% total and Over allocated status with default percentages', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-pct')).toHaveTextContent('102.5%'),
    );
    expect(screen.getByTestId('alloc-status')).toHaveTextContent('Over allocated');
  });

  it('shows correct total amount and difference with a bank net', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-amount').textContent).toContain('13,940.00'),
    );
    // 13600 × 1.025 = 13940; diff = +340
    expect(screen.getByTestId('alloc-diff').textContent).toContain('340.00');
    expect(screen.getByTestId('alloc-diff').textContent).toContain('+');
  });

  it('Balance to 100% adjusts guilt-free to 25% and shows Balanced status', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-pct')).toHaveTextContent('102.5%'),
    );

    await user.click(screen.getByTestId('btn-balance'));

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-pct')).toHaveTextContent('100.0%'),
    );
    expect(screen.getByTestId('alloc-status')).toHaveTextContent('Balanced');
    expect(screen.getByTestId('guilt-pct-display')).toHaveTextContent('25.0%');
  });

  it('Balance button is disabled when already balanced', async () => {
    const user = userEvent.setup();
    renderApp();

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-pct')).toHaveTextContent('102.5%'),
    );

    // Balance first
    await user.click(screen.getByTestId('btn-balance'));
    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-pct')).toHaveTextContent('100.0%'),
    );

    // Button should now be disabled since already balanced
    expect(screen.getByTestId('btn-balance')).toBeDisabled();
  });
});
