import type {
  CalculationPreview,
  FinancialProfile,
  HealthStatus,
  MonthlyContributionProjectionRequest,
  MonthlyContributionProjectionResponse,
} from '../types/api';

/**
 * Resolve the API base URL.
 *  - In dev/preview we honor VITE_API_BASE_URL when set.
 *  - When unset (and we're served by the backend in prod, or by the same origin
 *    via a proxy), use a relative URL so requests stay on the current host.
 */
function resolveBaseUrl(): string {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return '';
}

const BASE_URL = resolveBaseUrl();

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.message ?? body?.status ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface PreviewInput {
  grossSalary: number;
  bankNet: number;
  /** Optional Fixed Costs override (50–60). Defaults to 55 on the backend. */
  fixedCostsPercent?: number;
  /** Optional Guilt-Free Spending override (20–35). Defaults to 27.5 on the backend. */
  guiltFreeSpendingPercent?: number;
}

export const investorApi = {
  baseUrl: BASE_URL,

  health: () => http<HealthStatus>('/health'),

  preview: (input: PreviewInput) =>
    http<CalculationPreview>('/api/calculations/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listProfiles: () => http<FinancialProfile[]>('/api/profiles'),

  getProfile: (id: string) => http<FinancialProfile>(`/api/profiles/${id}`),

  createProfile: (input: {
    name: string;
    grossSalary: number;
    bankNet: number;
    fixedCostsPercent?: number;
    guiltFreeSpendingPercent?: number;
  }) =>
    http<FinancialProfile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteProfile: (id: string) =>
    http<{ id: string; deleted: true }>(`/api/profiles/${id}`, { method: 'DELETE' }),

  monthlyContributionProjection: (input: MonthlyContributionProjectionRequest) =>
    http<MonthlyContributionProjectionResponse>('/api/calculations/monthly-contribution-projection', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
