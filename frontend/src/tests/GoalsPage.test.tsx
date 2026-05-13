import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalsPage from '../pages/GoalsPage';
import { investorApi } from '../api/investorApi';
import type {
  FinancialGoal,
  FinancialProfile,
  GoalAnalysis,
  GoalsSummary,
} from '../types/api';

const profile: FinancialProfile = {
  id: 'profile-1',
  name: 'Alice',
  grossSalary: 20000,
  bankNet: 13600,
  fixedCostsPercent: null,
  guiltFreeSpendingPercent: null,
  currency: 'USD',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  spendingPlan: null,
};

const futureIso = (years: number, month = 1) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years, month - 1, 1);
  return d.toISOString();
};

function makeGoal(overrides: Partial<FinancialGoal>): FinancialGoal {
  return {
    id: 'g-default',
    profileId: 'profile-1',
    title: 'Default',
    category: 'CUSTOM',
    targetAmount: 1000,
    currentAmount: 100,
    targetDate: futureIso(5),
    expectedReturn: 0.07,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

const goals: FinancialGoal[] = [
  makeGoal({
    id: 'g-vacation',
    title: 'Vacation',
    category: 'VACATION',
    targetAmount: 10000,
    currentAmount: 1000,
    targetDate: futureIso(2),
    createdAt: '2026-04-01T00:00:00.000Z',
  }),
  makeGoal({
    id: 'g-apartment',
    title: 'Apartment',
    category: 'APARTMENT',
    targetAmount: 1000000,
    currentAmount: 250000,
    targetDate: futureIso(10),
    createdAt: '2026-05-01T00:00:00.000Z',
  }),
  makeGoal({
    id: 'g-car',
    title: 'Car',
    category: 'CAR',
    targetAmount: 50000,
    currentAmount: 25000, // 50% — highest progress
    targetDate: futureIso(4),
    createdAt: '2026-03-01T00:00:00.000Z',
  }),
];

const summary: GoalsSummary = {
  goalCount: 3,
  totalTargetAmount: 1060000,
  totalCurrentAmount: 276000,
  totalMonthlyRequired: 0,
  overallCompletionPercentage: 26,
  statusCounts: { ON_TRACK: 0, SLIGHTLY_BEHIND: 1, AT_RISK: 2 },
};

const analysisFor = (goal: FinancialGoal): GoalAnalysis => ({
  monthlyRequired: 100,
  projectedValueAtDeadline: goal.targetAmount * 0.9,
  completionPercentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
  status:
    goal.id === 'g-car'
      ? 'ON_TRACK'
      : goal.id === 'g-apartment'
      ? 'SLIGHTLY_BEHIND'
      : 'AT_RISK',
  estimatedCompletionDate: '2030-01-01',
  projection: [{ year: 1, value: goal.currentAmount * 1.07 }],
});

describe('GoalsPage sort + filter', () => {
  beforeEach(() => {
    vi.spyOn(investorApi, 'getGoalsForProfile').mockResolvedValue(goals);
    vi.spyOn(investorApi, 'getGoalsSummary').mockResolvedValue(summary);
    vi.spyOn(investorApi, 'getGoalAnalysis').mockImplementation((id: string) => {
      const g = goals.find((x) => x.id === id);
      return Promise.resolve(analysisFor(g!));
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const renderPage = () =>
    render(<GoalsPage profiles={[profile]} profilesLoading={false} />);

  const titlesInOrder = (): string[] => {
    const grid = screen.getByTestId('goal-grid');
    const cards = within(grid).getAllByTestId('goal-card');
    return cards.map((card) => within(card).getByRole('heading', { level: 3 }).textContent ?? '');
  };

  it('default sort is by deadline (soonest first)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('goal-grid')).toBeInTheDocument());
    // soonest deadline = Vacation (2 years), then Car (4 years), then Apartment (10 years)
    expect(titlesInOrder()).toEqual(['Vacation', 'Car', 'Apartment']);
    // touch user to satisfy linter; not required for flow
    void user;
  });

  it('switching sort to "Progress (highest)" puts Car first', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('goal-grid')).toBeInTheDocument());

    await user.selectOptions(screen.getByTestId('goals-sort'), 'progress-desc');

    // Car: 50%, Apartment: 25%, Vacation: 10%
    expect(titlesInOrder()).toEqual(['Car', 'Apartment', 'Vacation']);
  });

  it('switching sort to "Target amount (largest)" puts Apartment first', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('goal-grid')).toBeInTheDocument());

    await user.selectOptions(screen.getByTestId('goals-sort'), 'target-desc');

    expect(titlesInOrder()).toEqual(['Apartment', 'Car', 'Vacation']);
  });

  it('category filter narrows the list to a single category', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('goal-grid')).toBeInTheDocument());

    await user.selectOptions(screen.getByTestId('goals-category-filter'), 'CAR');

    expect(titlesInOrder()).toEqual(['Car']);
  });

  it('status filter narrows the list once analyses resolve', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('goal-grid')).toBeInTheDocument());

    // Wait for all analyses to land before filtering by status.
    await waitFor(() => {
      const grid = screen.getByTestId('goal-grid');
      expect(within(grid).getAllByTestId('goal-status-badge')).toHaveLength(3);
    });

    await user.selectOptions(screen.getByTestId('goals-status-filter'), 'ON_TRACK');

    expect(titlesInOrder()).toEqual(['Car']);
  });
});

describe('GoalsPage summary integration', () => {
  beforeEach(() => {
    vi.spyOn(investorApi, 'getGoalsForProfile').mockResolvedValue(goals);
    vi.spyOn(investorApi, 'getGoalsSummary').mockResolvedValue(summary);
    vi.spyOn(investorApi, 'getGoalAnalysis').mockImplementation((id: string) =>
      Promise.resolve(analysisFor(goals.find((g) => g.id === id)!)),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the summary card with the count chips', async () => {
    render(<GoalsPage profiles={[profile]} profilesLoading={false} />);
    await waitFor(() => expect(screen.getByTestId('goals-summary')).toBeInTheDocument());
    expect(screen.getByTestId('summary-count-at-risk').textContent).toMatch(/2 at risk/i);
  });
});
