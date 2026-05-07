import { useCallback, useEffect, useMemo, useState } from 'react';
import { investorApi } from '../api/investorApi';
import type { CreateGoalRequest, FinancialGoal, FinancialProfile } from '../types/api';
import GoalCard from '../components/GoalCard';
import CreateGoalModal from '../components/CreateGoalModal';

interface GoalsPageProps {
  profiles: FinancialProfile[];
  profilesLoading: boolean;
}

export default function GoalsPage({ profiles, profilesLoading }: GoalsPageProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      const data = await investorApi.getGoalsForProfile(id);
      setGoals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setGoals([]);
      return;
    }
    void refresh(selectedProfileId);
  }, [selectedProfileId, refresh]);

  const handleCreate = async (input: CreateGoalRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await investorApi.createGoal(input);
      setModalOpen(false);
      await refresh(input.profileId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create goal');
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
            onClick={() => setModalOpen(true)}
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
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="muted">Loading goals…</p>
          ) : goals.length === 0 ? (
            <div className="empty-state" data-testid="goals-empty">
              No goals yet for {selectedProfile?.name}. Click <strong>Create goal</strong> to add one.
            </div>
          ) : (
            <div className="goal-grid" data-testid="goal-grid">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  currency={selectedProfile?.currency ?? 'ILS'}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedProfile ? (
        <CreateGoalModal
          open={modalOpen}
          profileId={selectedProfile.id}
          onClose={() => {
            setModalOpen(false);
            setSubmitError(null);
          }}
          onSubmit={handleCreate}
          submitting={submitting}
          externalError={submitError}
        />
      ) : null}
    </section>
  );
}
