import { useCallback, useEffect, useMemo, useState } from 'react';
import { investorApi } from '../api/investorApi';
import type {
  CreateGoalRequest,
  FinancialGoal,
  FinancialProfile,
  GoalCategory,
  GoalsSummary,
  GoalStatus,
  UpdateGoalRequest,
} from '../types/api';
import GoalCard from '../components/GoalCard';
import CreateGoalModal from '../components/CreateGoalModal';
import GoalsSummaryCard from '../components/GoalsSummaryCard';

interface GoalsPageProps {
  profiles: FinancialProfile[];
  profilesLoading: boolean;
}

type SortKey = 'deadline-asc' | 'progress-desc' | 'target-desc' | 'newest';
type StatusFilter = 'ALL' | GoalStatus;
type CategoryFilter = 'ALL' | GoalCategory;

const CATEGORY_LABEL: Record<GoalCategory, string> = {
  EMERGENCY_FUND: 'Emergency Fund',
  RETIREMENT: 'Retirement',
  APARTMENT: 'Apartment',
  CAR: 'Car',
  VACATION: 'Vacation',
  EDUCATION: 'Education',
  CUSTOM: 'Custom',
};

function localCompletion(goal: FinancialGoal): number {
  if (goal.targetAmount <= 0) return 0;
  const raw = (goal.currentAmount / goal.targetAmount) * 100;
  if (raw <= 0) return 0;
  if (raw >= 100) return 100;
  return raw;
}

export default function GoalsPage({ profiles, profilesLoading }: GoalsPageProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<GoalsSummary | null>(null);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Per-card resolved status (collected as analyses arrive) — drives the status filter.
  const [statusByGoalId, setStatusByGoalId] = useState<Record<string, GoalStatus>>({});

  // Sort + filter state
  const [sortKey, setSortKey] = useState<SortKey>('deadline-asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  // Auto-select the first profile once one becomes available.
  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
    if (selectedProfileId && !profiles.find((p) => p.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0]?.id ?? '');
    }
  }, [profiles, selectedProfileId]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const refresh = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [goalRows, summaryRow] = await Promise.all([
        investorApi.getGoalsForProfile(id),
        investorApi.getGoalsSummary(id).catch(() => null),
      ]);
      setGoals(goalRows);
      setSummary(summaryRow);
      // Reset cached statuses; cards will repopulate as their analyses arrive.
      setStatusByGoalId({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setGoals([]);
      setSummary(null);
      return;
    }
    void refresh(selectedProfileId);
  }, [selectedProfileId, refresh]);

  const handleCreate = async (input: CreateGoalRequest | UpdateGoalRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Mode === 'create' guarantees CreateGoalRequest shape (with profileId).
      await investorApi.createGoal(input as CreateGoalRequest);
      setModalMode(null);
      await refresh(selectedProfileId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (input: CreateGoalRequest | UpdateGoalRequest) => {
    if (!editingGoal) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await investorApi.updateGoal(editingGoal.id, input as UpdateGoalRequest);
      setModalMode(null);
      setEditingGoal(null);
      await refresh(selectedProfileId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to update goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await investorApi.deleteGoal(id);
      if (selectedProfileId) await refresh(selectedProfileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete goal');
    }
  };

  const handleStatusResolved = useCallback((id: string, status: GoalStatus) => {
    setStatusByGoalId((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
  }, []);

  const visibleGoals = useMemo(() => {
    let list = goals.slice();

    if (categoryFilter !== 'ALL') {
      list = list.filter((g) => g.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      // Only filter goals whose status has resolved; leave unresolved cards visible
      // until their analysis arrives.
      list = list.filter((g) => {
        const s = statusByGoalId[g.id];
        return s == null ? true : s === statusFilter;
      });
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case 'deadline-asc':
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        case 'progress-desc':
          return localCompletion(b) - localCompletion(a);
        case 'target-desc':
          return b.targetAmount - a.targetAmount;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return list;
  }, [goals, statusByGoalId, sortKey, statusFilter, categoryFilter]);

  return (
    <section className="card goals-page" data-testid="goals-page" aria-label="Financial Goals">
      <header className="card__header card__header--row">
        <div>
          <h2>Financial Goals</h2>
          <p className="muted">
            Track progress toward each goal with required monthly contribution and yearly forecast.
          </p>
        </div>
        <div className="goals-page__controls">
          {profiles.length > 0 ? (
            <label className="field goals-page__profile-picker">
              <span className="field__label">Profile</span>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                aria-label="Select profile for goals"
                data-testid="goals-profile-picker"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditingGoal(null);
              setSubmitError(null);
              setModalMode('create');
            }}
            disabled={!selectedProfile}
            data-testid="goals-create-btn"
          >
            Create goal
          </button>
        </div>
      </header>

      {profilesLoading && profiles.length === 0 ? (
        <p className="muted">Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <div className="empty-state" data-testid="goals-empty-no-profile">
          Save a profile first — goals are linked to a financial profile.
        </div>
      ) : (
        <>
          {summary && summary.goalCount > 0 && selectedProfile ? (
            <GoalsSummaryCard summary={summary} currency={selectedProfile.currency} />
          ) : null}

          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}

          {goals.length > 0 && (
            <div className="goals-toolbar" data-testid="goals-toolbar">
              <label className="field goals-toolbar__field">
                <span className="field__label">Sort by</span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Sort goals"
                  data-testid="goals-sort"
                >
                  <option value="deadline-asc">Deadline (soonest)</option>
                  <option value="progress-desc">Progress (highest)</option>
                  <option value="target-desc">Target amount (largest)</option>
                  <option value="newest">Newest first</option>
                </select>
              </label>
              <label className="field goals-toolbar__field">
                <span className="field__label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  aria-label="Filter by status"
                  data-testid="goals-status-filter"
                >
                  <option value="ALL">All statuses</option>
                  <option value="ON_TRACK">On track</option>
                  <option value="SLIGHTLY_BEHIND">Slightly behind</option>
                  <option value="AT_RISK">At risk</option>
                </select>
              </label>
              <label className="field goals-toolbar__field">
                <span className="field__label">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  aria-label="Filter by category"
                  data-testid="goals-category-filter"
                >
                  <option value="ALL">All categories</option>
                  {(Object.keys(CATEGORY_LABEL) as GoalCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {loading ? (
            <p className="muted">Loading goals…</p>
          ) : goals.length === 0 ? (
            <div className="empty-state" data-testid="goals-empty">
              No goals yet for {selectedProfile?.name}. Click <strong>Create goal</strong> to add one.
            </div>
          ) : visibleGoals.length === 0 ? (
            <div className="empty-state" data-testid="goals-no-match">
              No goals match the current filters.
            </div>
          ) : (
            <div className="goal-grid" data-testid="goal-grid">
              {visibleGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  currency={selectedProfile?.currency ?? 'ILS'}
                  onDelete={handleDelete}
                  onEdit={(goal) => {
                    setEditingGoal(goal);
                    setSubmitError(null);
                    setModalMode('edit');
                  }}
                  onContributionAdded={() => {
                    if (selectedProfileId) void refresh(selectedProfileId);
                  }}
                  onStatusResolved={handleStatusResolved}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedProfile && modalMode === 'create' ? (
        <CreateGoalModal
          open
          mode="create"
          profileId={selectedProfile.id}
          onClose={() => {
            setModalMode(null);
            setSubmitError(null);
          }}
          onSubmit={handleCreate}
          submitting={submitting}
          externalError={submitError}
        />
      ) : null}

      {modalMode === 'edit' && editingGoal ? (
        <CreateGoalModal
          open
          mode="edit"
          initial={editingGoal}
          onClose={() => {
            setModalMode(null);
            setEditingGoal(null);
            setSubmitError(null);
          }}
          onSubmit={handleUpdate}
          submitting={submitting}
          externalError={submitError}
        />
      ) : null}
    </section>
  );
}
