import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalForecastChart from '../components/GoalForecastChart';

describe('GoalForecastChart', () => {
  const data = [
    { year: 1, value: 1070 },
    { year: 2, value: 1144.9 },
    { year: 3, value: 1225.04 },
  ];

  it('renders the chart container', () => {
    render(<GoalForecastChart data={data} targetAmount={2000} currency="USD" />);
    expect(screen.getByTestId('goal-forecast-chart')).toBeInTheDocument();
  });

  it('renders empty state when there are no projection points', () => {
    render(<GoalForecastChart data={[]} targetAmount={1000} currency="USD" />);
    // Chart still mounts; just validate we don't crash and the testid is present.
    expect(screen.getByTestId('goal-forecast-chart')).toBeInTheDocument();
  });
});
