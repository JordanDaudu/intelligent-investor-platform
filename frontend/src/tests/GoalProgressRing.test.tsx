import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalProgressRing from '../components/GoalProgressRing';

describe('GoalProgressRing', () => {
  it('renders the rounded percentage', () => {
    render(<GoalProgressRing percentage={42.4} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('clamps values above 100 to 100%', () => {
    render(<GoalProgressRing percentage={250} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative values to 0%', () => {
    render(<GoalProgressRing percentage={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('treats non-finite input as 0%', () => {
    render(<GoalProgressRing percentage={Number.NaN} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders an accessible title', () => {
    render(<GoalProgressRing percentage={30} ariaLabel="30% of Buy Apartment complete" />);
    expect(screen.getByTitle('30% of Buy Apartment complete')).toBeInTheDocument();
  });

  it('renders an optional caption below the ring', () => {
    render(<GoalProgressRing percentage={50} caption="$5,000 of $10,000" />);
    expect(screen.getByText('$5,000 of $10,000')).toBeInTheDocument();
  });
});
