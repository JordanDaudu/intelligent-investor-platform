import { useEffect, useState } from 'react';
import { investorApi } from '../api/investorApi';
import type { HealthStatus } from '../types/api';

type Status = 'loading' | 'online' | 'offline';

export default function HealthStatusCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await investorApi.health();
      setData(res);
      setStatus(res.status === 'ok' ? 'online' : 'offline');
    } catch (e) {
      setStatus('offline');
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const dbConnected = data?.database === 'connected';
  // The backend /health response intentionally returns only { status, database }
  // to match the spec contract — surface the build-time mode here instead.
  const env = import.meta.env.MODE;

  return (
    <section className="card health-card" aria-label="DevOps health status">
      <header className="card__header card__header--row">
        <div>
          <h2>DevOps health</h2>
          <p className="muted">Live status from the backend /health endpoint.</p>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={refresh}>
          Refresh
        </button>
      </header>

      <ul className="health-list">
        <li>
          <span className="health-list__label">Backend</span>
          <span
            className={`pill pill--${status === 'online' ? 'ok' : status === 'loading' ? 'warn' : 'err'}`}
            data-testid="health-backend"
          >
            {status === 'online' ? 'Online' : status === 'loading' ? 'Checking…' : 'Offline'}
          </span>
        </li>
        <li>
          <span className="health-list__label">Database</span>
          <span
            className={`pill pill--${dbConnected ? 'ok' : status === 'loading' ? 'warn' : 'err'}`}
            data-testid="health-database"
          >
            {dbConnected ? 'Connected' : status === 'loading' ? 'Checking…' : 'Disconnected'}
          </span>
        </li>
        <li>
          <span className="health-list__label">Environment</span>
          <span className="pill pill--info" data-testid="health-env">{env}</span>
        </li>
      </ul>

      {error ? <div className="muted health-card__error">{error}</div> : null}
    </section>
  );
}
