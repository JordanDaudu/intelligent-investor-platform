import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalsSummaryCard from '../components/GoalsSummaryCard';
import type { GoalsSummary } from '../types/api';

const summary: GoalsSummary = {
  goalCount: 4,
  totalTargetAmount: 1250000,
  totalCurrentAmount: 312000,
  totalMonthlyRequired: 9120,
  overallCompletionPercentage: 24,
  statusCounts: { ON_TRACK: 1, SLIGHTLY_BEHIND: 2, AT_RISK: 1 },
};

describe('GoalsSummaryCard', () => {
  it('renders all KPI values and status chips', () => {
    render(<GoalsSummaryCard summary={summary} currency="USD" />);

    expect(screen.getByTestId('summary-total-target').textContent).toContain('1,250,000');
    expect(screen.getByTestId('summary-total-saved').textContent).toContain('312,000');
    expect(screen.getByTestId('summary-monthly').textContent).toContain('9,120');
    expect(screen.getByTestId('summary-progress').textContent).toContain('24%');

    expect(screen.getByTestId('summary-count-on-track').textContent).toMatch(/1 on track/i);
    expect(screen.getByTestId('summary-count-slightly-behind').textContent).toMatch(/2 slightly behind/i);
    expect(screen.getByTestId('summary-count-at-risk').textContent).toMatch(/1 at risk/i);
  });

  it('applies status-color classes to the status chips', () => {
    render(<GoalsSummaryCard summary={summary} currency="USD" />);
    expect(screen.getByTestId('summary-count-on-track').className).toContain('goal-status--on-track');
    expect(screen.getByTestId('summary-count-slightly-behind').className).toContain(
      'goal-status--slightly-behind',
    );
    expect(screen.getByTestId('summary-count-at-risk').className).toContain('goal-status--at-risk');
  });

  it('renders nothing when goalCount is zero', () => {
    const { container } = render(
      <GoalsSummaryCard
        summary={{
          goalCount: 0,
          totalTargetAmount: 0,
          totalCurrentAmount: 0,
          totalMonthlyRequired: 0,
          overallCompletionPercentage: 0,
          statusCounts: { ON_TRACK: 0, SLIGHTLY_BEHIND: 0, AT_RISK: 0 },
        }}
        currency="USD"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('singularises "goal" when goalCount === 1', () => {
    render(
      <GoalsSummaryCard
        summary={{ ...summary, goalCount: 1 }}
        currency="USD"
      />,
    );
    expect(screen.getByText(/Across all 1 goal\b/i)).toBeInTheDocument();
  });
});
