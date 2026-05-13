import type { Currency, GoalsSummary } from '../types/api';

interface GoalsSummaryCardProps {
  summary: GoalsSummary;
  currency: Currency;
}

function formatInCurrency(amount: number, code: Currency): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

export default function GoalsSummaryCard({ summary, currency }: GoalsSummaryCardProps) {
  if (summary.goalCount === 0) return null;

  return (
    <section className="goals-summary card" data-testid="goals-summary">
      <header className="goals-summary__header">
        <h3>Portfolio summary</h3>
        <p className="muted">Across all {summary.goalCount} goal{summary.goalCount === 1 ? '' : 's'} on this profile.</p>
      </header>

      <div className="goals-summary__grid">
        <div className="goals-summary__stat">
          <div className="muted">Total target</div>
          <div className="goals-summary__value" data-testid="summary-total-target">
            {formatInCurrency(summary.totalTargetAmount, currency)}
          </div>
        </div>
        <div className="goals-summary__stat">
          <div className="muted">Total saved</div>
          <div className="goals-summary__value" data-testid="summary-total-saved">
            {formatInCurrency(summary.totalCurrentAmount, currency)}
          </div>
        </div>
        <div className="goals-summary__stat">
          <div className="muted">Required monthly</div>
          <div className="goals-summary__value" data-testid="summary-monthly">
            {formatInCurrency(summary.totalMonthlyRequired, currency)}
          </div>
        </div>
        <div className="goals-summary__stat">
          <div className="muted">Overall progress</div>
          <div className="goals-summary__value" data-testid="summary-progress">
            {summary.overallCompletionPercentage}%
          </div>
        </div>
      </div>

      <div className="goals-summary__chips">
        <span
          className="status-badge goal-status--on-track"
          data-testid="summary-count-on-track"
        >
          {summary.statusCounts.ON_TRACK} on track
        </span>
        <span
          className="status-badge goal-status--slightly-behind"
          data-testid="summary-count-slightly-behind"
        >
          {summary.statusCounts.SLIGHTLY_BEHIND} slightly behind
        </span>
        <span
          className="status-badge goal-status--at-risk"
          data-testid="summary-count-at-risk"
        >
          {summary.statusCounts.AT_RISK} at risk
        </span>
      </div>
    </section>
  );
}
