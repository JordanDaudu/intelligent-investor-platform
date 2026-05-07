import { useEffect, useState } from 'react';
import { investorApi } from '../api/investorApi';
import type {
  Currency,
  FinancialGoal,
  GoalAnalysis,
  GoalCategory,
  GoalStatus,
} from '../types/api';
import GoalProgressRing from './GoalProgressRing';
import GoalForecastChart from './GoalForecastChart';

interface GoalCardProps {
  goal: FinancialGoal;
  /** Currency to format displayed amounts in (the owning profile's currency). */
  currency: Currency;
  onDelete: (id: string) => void;
  onEdit?: (goal: FinancialGoal) => void;
  /** Called after a successful quick-contribute; parent should refresh data. */
  onContributionAdded?: () => void;
  /** Optional: surface this card's status to the parent for filtering/aggregation. */
  onStatusResolved?: (id: string, status: GoalStatus) => void;
  /** Optional pre-computed analysis. When omitted, the card fetches its own. */
  analysis?: GoalAnalysis | null;
}

const CATEGORY_LABEL: Record<GoalCategory, string> = {
  EMERGENCY_FUND: 'Emergency Fund',
  RETIREMENT: 'Retirement',
  APARTMENT: 'Apartment',
  CAR: 'Car',
  VACATION: 'Vacation',
  EDUCATION: 'Education',
  CUSTOM: 'Custom',
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  ON_TRACK: 'On track',
  SLIGHTLY_BEHIND: 'Slightly behind',
  AT_RISK: 'At risk',
};

const STATUS_CLASS: Record<GoalStatus, string> = {
  ON_TRACK: 'goal-status--on-track',
  SLIGHTLY_BEHIND: 'goal-status--slightly-behind',
  AT_RISK: 'goal-status--at-risk',
};

function formatInCurrency(amount: number, code: Currency): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

function localCompletion(goal: FinancialGoal): number {
  if (goal.targetAmount <= 0) return 0;
  const raw = (goal.currentAmount / goal.targetAmount) * 100;
  if (raw <= 0) return 0;
  if (raw >= 100) return 100;
  return Math.round(raw);
}

export default function GoalCard({
  goal,
  currency,
  onDelete,
  onEdit,
  onContributionAdded,
  onStatusResolved,
  analysis: provided,
}: GoalCardProps) {
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(provided ?? null);
  const [loading, setLoading] = useState(provided == null);
  const [error, setError] = useState<string | null>(null);

  const [contributing, setContributing] = useState(false);
  const [contribOpen, setContribOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState(0);
  const [contribError, setContribError] = useState<string | null>(null);

  useEffect(() => {
    if (provided !== undefined) {
      setAnalysis(provided);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    investorApi
      .getGoalAnalysis(goal.id)
      .then((res) => {
        if (cancelled) return;
        setAnalysis(res);
        onStatusResolved?.(goal.id, res.status);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analysis');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goal.id, provided, onStatusResolved]);

  const completion = analysis?.completionPercentage ?? localCompletion(goal);
  const status = analysis?.status ?? null;

  const submitContribution = async () => {
    if (contribAmount <= 0) {
      setContribError('Enter a positive amount.');
      return;
    }
    setContributing(true);
    setContribError(null);
    try {
      await investorApi.updateGoal(goal.id, {
        currentAmount: goal.currentAmount + contribAmount,
      });
      setContribOpen(false);
      setContribAmount(0);
      onContributionAdded?.();
    } catch (e) {
      setContribError(e instanceof Error ? e.message : 'Failed to add contribution');
    } finally {
      setContributing(false);
    }
  };

  return (
    <article className="goal-card card" data-testid="goal-card">
      <header className="goal-card__header">
        <div>
          <span className="badge badge--optional">{CATEGORY_LABEL[goal.category]}</span>
          <h3 className="goal-card__title">{goal.title}</h3>
          <p className="muted goal-card__deadline">
            Target by {formatDate(goal.targetDate)}
          </p>
        </div>
        {status ? (
          <span
            className={`status-badge ${STATUS_CLASS[status]}`}
            data-testid="goal-status-badge"
          >
            {STATUS_LABEL[status]}
          </span>
        ) : null}
      </header>

      <div className="goal-card__body">
        <GoalProgressRing
          percentage={completion}
          caption={`${formatInCurrency(goal.currentAmount, currency)} of ${formatInCurrency(goal.targetAmount, currency)}`}
          ariaLabel={`${completion}% of ${goal.title} complete`}
        />

        <div className="goal-card__stats">
          <div className="goal-card__stat">
            <div className="muted">Target amount</div>
            <div className="goal-card__stat-value">
              {formatInCurrency(goal.targetAmount, currency)}
            </div>
          </div>
          <div className="goal-card__stat">
            <div className="muted">Currently saved</div>
            <div className="goal-card__stat-value">
              {formatInCurrency(goal.currentAmount, currency)}
            </div>
          </div>
          <div className="goal-card__stat">
            <div className="muted">Required monthly</div>
            <div className="goal-card__stat-value">
              {analysis ? formatInCurrency(analysis.monthlyRequired, currency) : '—'}
            </div>
          </div>
          <div className="goal-card__stat">
            <div className="muted">Estimated completion</div>
            <div className="goal-card__stat-value">
              {analysis ? formatDate(analysis.estimatedCompletionDate) : '—'}
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="muted">Loading analysis…</p>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {analysis && analysis.projection.length > 0 && (
        <GoalForecastChart
          data={analysis.projection}
          targetAmount={goal.targetAmount}
          currency={currency}
        />
      )}

      {contribOpen ? (
        <div className="goal-card__contrib" data-testid="goal-contrib">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={contribAmount || ''}
            placeholder="Amount to add"
            aria-label="Contribution amount"
            onChange={(e) => {
              const raw = e.target.value.trim();
              setContribAmount(raw === '' ? 0 : Math.max(0, Number(raw) || 0));
            }}
          />
          <button
            type="button"
            className="btn btn--small btn--primary"
            onClick={() => void submitContribution()}
            disabled={contributing}
            data-testid="goal-contrib-submit"
          >
            {contributing ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => {
              setContribOpen(false);
              setContribAmount(0);
              setContribError(null);
            }}
          >
            Cancel
          </button>
          {contribError ? (
            <div className="alert alert--error" role="alert" data-testid="goal-contrib-error">
              {contribError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="goal-card__actions">
        {!contribOpen && (
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => setContribOpen(true)}
            data-testid="goal-contrib-open"
          >
            + Add
          </button>
        )}
        {onEdit ? (
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => onEdit(goal)}
            data-testid="goal-edit"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => onDelete(goal.id)}
          data-testid="goal-delete"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
