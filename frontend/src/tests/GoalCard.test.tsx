import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalCard from '../components/GoalCard';
import type { FinancialGoal, GoalAnalysis } from '../types/api';
import { investorApi } from '../api/investorApi';

const goal: FinancialGoal = {
  id: 'goal-1',
  profileId: 'profile-1',
  title: 'Buy Apartment',
  category: 'APARTMENT',
  targetAmount: 1000000,
  currentAmount: 250000,
  targetDate: '2034-07-01T00:00:00.000Z',
  expectedReturn: 0.07,
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
};

const analysis: GoalAnalysis = {
  monthlyRequired: 4380,
  projectedValueAtDeadline: 980000,
  completionPercentage: 35,
  status: 'SLIGHTLY_BEHIND',
  estimatedCompletionDate: '2034-07-01',
  projection: [
    { year: 1, value: 267500 },
    { year: 2, value: 286225 },
  ],
};

describe('GoalCard', () => {
  beforeEach(() => {
    vi.spyOn(investorApi, 'getGoalAnalysis').mockResolvedValue(analysis);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders title, category badge and target/current amounts', async () => {
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);

    expect(screen.getByText('Buy Apartment')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();
    // Target + current amounts (USD format)
    expect(screen.getAllByText(/\$1,000,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$250,000/).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByTestId('goal-status-badge')).toHaveTextContent('Slightly behind');
    });
  });

  it('renders the status badge with the slightly-behind class when analysis returns SLIGHTLY_BEHIND', async () => {
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);
    const badge = await screen.findByTestId('goal-status-badge');
    expect(badge.className).toContain('goal-status--slightly-behind');
  });

  it('renders ON_TRACK badge with the on-track class', async () => {
    vi.spyOn(investorApi, 'getGoalAnalysis').mockResolvedValue({
      ...analysis,
      status: 'ON_TRACK',
    });
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);
    const badge = await screen.findByTestId('goal-status-badge');
    expect(badge).toHaveTextContent('On track');
    expect(badge.className).toContain('goal-status--on-track');
  });

  it('renders AT_RISK badge with the at-risk class', async () => {
    vi.spyOn(investorApi, 'getGoalAnalysis').mockResolvedValue({
      ...analysis,
      status: 'AT_RISK',
    });
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);
    const badge = await screen.findByTestId('goal-status-badge');
    expect(badge).toHaveTextContent('At risk');
    expect(badge.className).toContain('goal-status--at-risk');
  });

  it('renders the progress ring with the analysis completion percentage', async () => {
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('35%')).toBeInTheDocument();
    });
  });

  it('falls back to local completion percentage when analysis is unavailable', async () => {
    vi.spyOn(investorApi, 'getGoalAnalysis').mockRejectedValue(new Error('boom'));
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);
    // Local calc: 250000 / 1000000 = 25%
    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('Edit button fires onEdit with the goal', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} onEdit={onEdit} />);

    await user.click(screen.getByTestId('goal-edit'));
    expect(onEdit).toHaveBeenCalledWith(goal);
  });

  it('Quick Add submits PATCH with currentAmount + delta and calls onContributionAdded', async () => {
    const updateSpy = vi.spyOn(investorApi, 'updateGoal').mockResolvedValue({
      ...goal,
      currentAmount: goal.currentAmount + 1000,
    });
    const onContributionAdded = vi.fn();
    const user = userEvent.setup();

    render(
      <GoalCard
        goal={goal}
        currency="USD"
        onDelete={() => {}}
        onContributionAdded={onContributionAdded}
      />,
    );

    await user.click(screen.getByTestId('goal-contrib-open'));
    const input = screen.getByLabelText(/contribution amount/i);
    await user.type(input, '1000');
    await user.click(screen.getByTestId('goal-contrib-submit'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('goal-1', {
        currentAmount: 251000,
      });
    });
    expect(onContributionAdded).toHaveBeenCalled();
  });

  it('Quick Add shows an error and does not call API when amount is non-positive', async () => {
    const updateSpy = vi.spyOn(investorApi, 'updateGoal').mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<GoalCard goal={goal} currency="USD" onDelete={() => {}} />);

    await user.click(screen.getByTestId('goal-contrib-open'));
    await user.click(screen.getByTestId('goal-contrib-submit'));

    expect(await screen.findByTestId('goal-contrib-error')).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
