import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/DashboardPage';
import { investorApi } from '../api/investorApi';
import type { CalculationPreview } from '../types/api';
import type { PreviewInput } from '../api/investorApi';

function makePreview(
  bankNet: number,
  grossSalary = 0,
  fixedCostsPercent = 55,
  guiltFreeSpendingPercent = 27.5,
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
  };
}

function setupMocks() {
  vi.spyOn(investorApi, 'listProfiles').mockResolvedValue([]);
  vi.spyOn(investorApi, 'health').mockResolvedValue({
    status: 'ok',
    database: 'connected',
  });
  vi.spyOn(investorApi, 'preview').mockImplementation(
    ({ grossSalary, bankNet, fixedCostsPercent = 55, guiltFreeSpendingPercent = 27.5 }: PreviewInput) =>
      Promise.resolve(makePreview(bankNet, grossSalary, fixedCostsPercent, guiltFreeSpendingPercent)),
  );
  vi.spyOn(investorApi, 'monthlyContributionProjection').mockImplementation(({ monthlyContribution, annualReturnRate = 0.07, years = 15 }) =>
    Promise.resolve({
      monthlyContribution,
      annualReturnRate,
      years,
      projection: Array.from({ length: years }, (_, i) => ({ year: i + 1, value: (i + 1) * 1000 })),
    }),
  );
}

describe('Salary form ↔ bucket cards', () => {
  beforeEach(setupMocks);

  it('updates the four bucket amounts when the user enters a bank-net value', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() => {
      expect(screen.getByTestId('bucket-fixed-amount')).toHaveTextContent('$7,480.00');
      expect(screen.getByTestId('bucket-savings-amount')).toHaveTextContent('$1,360.00');
      expect(screen.getByTestId('bucket-investments-amount')).toHaveTextContent('$1,360.00');
      expect(screen.getByTestId('bucket-guilt-amount')).toHaveTextContent('$3,740.00');
    });
  });

  it('Estimate button fills bank net as gross × 0.68', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const grossInput = screen.getByLabelText(/Gross monthly salary/i);
    await user.clear(grossInput);
    await user.type(grossInput, '20000');

    await user.click(screen.getByRole('button', { name: /Estimate/i }));

    const netInput = screen.getByLabelText(/Bank net/i) as HTMLInputElement;
    expect(netInput.value).toBe('13600');

    await waitFor(() =>
      expect(screen.getByTestId('bucket-fixed-amount')).toHaveTextContent('$7,480.00'),
    );
  });
});

describe('Investment Projection section', () => {
  beforeEach(setupMocks);

  it('renders the Investment Projection section', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('investment-projection')).toBeInTheDocument();
    expect(screen.getByText('Investment Projection')).toBeInTheDocument();
  });

  it('shows "Assignment Default" badge at default settings (7%, 15 years)', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('projection-mode-badge')).toHaveTextContent('Assignment Default');
  });

  it('defaults the annual return display to 7.0%', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('return-rate-display')).toHaveTextContent('7.0%');
  });

  it('defaults the time horizon display to 15 years', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('years-display')).toHaveTextContent('15 years');
  });

  it('changes badge to "Scenario Mode" when annual return slider is moved', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<DashboardPage />);

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
    render(<DashboardPage />);

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

  it('entering bank net 680 shows Active Investments = $68.00', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '680');

    await waitFor(() => {
      expect(screen.getByTestId('bucket-investments-amount')).toHaveTextContent('$68.00');
    });
  });

  it('Monthly Contribution Projection section appears in the page', async () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('monthly-contribution-projection')).toBeInTheDocument();
    expect(screen.getByText('Monthly Contribution Projection')).toBeInTheDocument();
    expect(screen.getByText('Extra Credit')).toBeInTheDocument();
  });

  it('Monthly Contribution Projection has Annual return and Time horizon sliders', () => {
    render(<DashboardPage />);
    expect(
      screen.getByLabelText(/Monthly contribution annual return rate/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly contribution years/i)).toBeInTheDocument();
  });

  it('Investment Projection and Monthly Contribution Projection are separate sections', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('investment-projection')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-contribution-projection')).toBeInTheDocument();
  });
});

describe('Allocation Controls', () => {
  beforeEach(setupMocks);

  it('shows 102.5% total and Over allocated status with default percentages', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

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
    render(<DashboardPage />);

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('alloc-total-amount')).toHaveTextContent('$13,940.00'),
    );
    // 13600 × 1.025 = 13940; diff = +340
    expect(screen.getByTestId('alloc-diff')).toHaveTextContent('+$340.00');
  });

  it('Balance to 100% adjusts guilt-free to 25% and shows Balanced status', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

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
    render(<DashboardPage />);

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
