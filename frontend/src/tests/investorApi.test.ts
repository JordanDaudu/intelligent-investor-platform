import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { investorApi } from '../api/investorApi';

type FetchArgs = Parameters<typeof fetch>;

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

describe('investorApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastCall(): { url: string; init: RequestInit } {
    const [url, init] = fetchMock.mock.calls.at(-1) as FetchArgs;
    return { url: String(url), init: (init ?? {}) as RequestInit };
  }

  describe('GET endpoints', () => {
    it('health() requests /health and returns the parsed body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', database: 'connected' }));

      const result = await investorApi.health();

      const { url, init } = lastCall();
      expect(url.endsWith('/health')).toBe(true);
      expect(init.method).toBeUndefined(); // default GET
      expect((init.headers as Record<string, string>)['Accept']).toBe('application/json');
      expect(result).toEqual({ status: 'ok', database: 'connected' });
    });

    it('listProfiles() requests /api/profiles', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await investorApi.listProfiles();
      expect(lastCall().url.endsWith('/api/profiles')).toBe(true);
    });

    it('getProfile(id) embeds the id in the path', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'abc' }));
      await investorApi.getProfile('abc');
      expect(lastCall().url.endsWith('/api/profiles/abc')).toBe(true);
    });

    it('currencies() requests /api/currencies and returns the parsed body', async () => {
      const body = {
        supported: ['ILS', 'USD', 'EUR', 'GBP'],
        default: 'ILS',
        ratesInIls: { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 },
      };
      fetchMock.mockResolvedValue(jsonResponse(body));

      const result = await investorApi.currencies();

      expect(lastCall().url.endsWith('/api/currencies')).toBe(true);
      expect(result).toEqual(body);
    });
  });

  describe('mutating endpoints', () => {
    it('preview() POSTs JSON body and forwards override fields', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ buckets: {} }));

      await investorApi.preview({
        grossSalary: 20000,
        bankNet: 13600,
        fixedCostsPercent: 55,
        guiltFreeSpendingPercent: 27.5,
      });

      const { url, init } = lastCall();
      expect(url.endsWith('/api/calculations/preview')).toBe(true);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body as string)).toEqual({
        grossSalary: 20000,
        bankNet: 13600,
        fixedCostsPercent: 55,
        guiltFreeSpendingPercent: 27.5,
      });
    });

    it('createProfile() POSTs to /api/profiles', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'x' }));

      await investorApi.createProfile({ name: 'Alice', grossSalary: 1, bankNet: 1 });

      const { url, init } = lastCall();
      expect(url.endsWith('/api/profiles')).toBe(true);
      expect(init.method).toBe('POST');
    });

    it('createProfile() forwards an explicit currency in the request body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'x' }));

      await investorApi.createProfile({
        name: 'Pierre',
        grossSalary: 1,
        bankNet: 1,
        currency: 'EUR',
      });

      const { init } = lastCall();
      const body = JSON.parse(init.body as string);
      expect(body.currency).toBe('EUR');
    });

    it('preview() forwards an explicit currency in the request body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await investorApi.preview({
        grossSalary: 100,
        bankNet: 68,
        currency: 'GBP',
      });

      const { init } = lastCall();
      const body = JSON.parse(init.body as string);
      expect(body.currency).toBe('GBP');
    });

    it('deleteProfile() issues DELETE and returns the parsed body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'abc', deleted: true }));

      const result = await investorApi.deleteProfile('abc');

      const { url, init } = lastCall();
      expect(url.endsWith('/api/profiles/abc')).toBe(true);
      expect(init.method).toBe('DELETE');
      expect(result).toEqual({ id: 'abc', deleted: true });
    });

    it('monthlyContributionProjection() POSTs the request body verbatim', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ projection: [] }));

      await investorApi.monthlyContributionProjection({
        monthlyContribution: 68,
        annualReturnRate: 0.05,
        years: 10,
      });

      const { url, init } = lastCall();
      expect(url.endsWith('/api/calculations/monthly-contribution-projection')).toBe(true);
      expect(JSON.parse(init.body as string)).toEqual({
        monthlyContribution: 68,
        annualReturnRate: 0.05,
        years: 10,
      });
    });
  });

  describe('error handling', () => {
    it('throws an Error using the backend message when response is not ok', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: 'monthlyContribution must not be negative' }, { status: 400 }),
      );

      await expect(investorApi.preview({ grossSalary: -1, bankNet: 1 })).rejects.toThrow(
        'monthlyContribution must not be negative',
      );
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
      fetchMock.mockResolvedValue(
        new Response('something exploded', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      await expect(investorApi.health()).rejects.toThrow('Request failed (500)');
    });

    it('returns undefined for a 204 No Content response', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204));

      const result = await investorApi.deleteProfile('abc');

      // Wrapper resolves with undefined, which the typed signature documents as the deleted shape.
      expect(result).toBeUndefined();
    });

    it('propagates network failures from fetch itself', async () => {
      fetchMock.mockRejectedValue(new Error('NetworkError when attempting to fetch resource.'));

      await expect(investorApi.listProfiles()).rejects.toThrow(/NetworkError/);
    });
  });

  it('exposes the resolved baseUrl as a string', () => {
    expect(typeof investorApi.baseUrl).toBe('string');
  });
});
