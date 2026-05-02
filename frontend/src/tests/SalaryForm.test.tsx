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
}

describe('Salary form ↔ bucket cards', () => {
  beforeEach(setupMocks);

  it('updates the four bucket amounts when the user enters a bank-net value', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    await waitFor(() =>
      expect(screen.getByTestId('bucket-fixed-amount')).toHaveTextContent('$7,480.00'),
    );
    expect(screen.getByTestId('bucket-savings-amount')).toHaveTextContent('$1,360.00');
    expect(screen.getByTestId('bucket-investments-amount')).toHaveTextContent('$1,360.00');
    expect(screen.getByTestId('bucket-guilt-amount')).toHaveTextContent('$3,740.00');
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
