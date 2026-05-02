import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/DashboardPage';
import { investorApi } from '../api/investorApi';

describe('Salary form ↔ bucket cards', () => {
  beforeEach(() => {
    vi.spyOn(investorApi, 'listProfiles').mockResolvedValue([]);
    vi.spyOn(investorApi, 'health').mockResolvedValue({
      status: 'ok',
      database: 'connected',
    });
  });

  it('updates the four bucket amounts when the user enters a bank-net value', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const netInput = screen.getByLabelText(/Bank net/i);
    await user.clear(netInput);
    await user.type(netInput, '13600');

    expect(screen.getByTestId('bucket-fixed-amount')).toHaveTextContent('$7,480.00');
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
    expect(screen.getByTestId('bucket-fixed-amount')).toHaveTextContent('$7,480.00');
  });
});
