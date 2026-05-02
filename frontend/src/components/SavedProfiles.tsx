import type { FinancialProfile } from '../types/api';

interface SavedProfilesProps {
  profiles: FinancialProfile[];
  loading: boolean;
  error: string | null;
  onLoad: (profile: FinancialProfile) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const formatUsd = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function SavedProfiles({
  profiles,
  loading,
  error,
  onLoad,
  onDelete,
  onRefresh,
}: SavedProfilesProps) {
  return (
    <section className="card saved-profiles" aria-label="Saved profiles">
      <header className="card__header card__header--row">
        <div>
          <h2>Saved profiles</h2>
          <p className="muted">Stored in PostgreSQL via the backend API.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error ? <div className="alert alert--error" role="alert">{error}</div> : null}

      {profiles.length === 0 && !loading ? (
        <div className="empty-state">No saved profiles yet — fill in the form and hit Save.</div>
      ) : (
        <ul className="profile-list" data-testid="profile-list">
          {profiles.map((p) => (
            <li key={p.id} className="profile-list__item" data-testid="profile-row">
              <div className="profile-list__main">
                <div className="profile-list__name">{p.name}</div>
                <div className="profile-list__meta muted">
                  Bank net {formatUsd(p.bankNet)} · saved {formatDate(p.createdAt)}
                </div>
              </div>
              <div className="profile-list__actions">
                <button type="button" className="btn btn--small" onClick={() => onLoad(p)}>
                  Load
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
