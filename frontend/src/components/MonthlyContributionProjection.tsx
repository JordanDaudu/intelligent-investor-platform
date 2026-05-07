import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { investorApi } from '../api/investorApi';
import type { MonthlyContributionProjectionResponse } from '../types/api';
import { useCurrency } from '../currency/CurrencyContext';

interface MonthlyContributionProjectionProps {
  defaultMonthlyContribution: number;
}

export default function MonthlyContributionProjection({
  defaultMonthlyContribution,
}: MonthlyContributionProjectionProps) {
  const { format: formatUsd, currency } = useCurrency();
  const [returnRate, setReturnRate] = useState(0.07);
  const [years, setYears] = useState(15);
  const [result, setResult] = useState<MonthlyContributionProjectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultMonthlyContribution <= 0) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    investorApi
      .monthlyContributionProjection({
        monthlyContribution: defaultMonthlyContribution,
        annualReturnRate: returnRate,
        years,
        currency,
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [defaultMonthlyContribution, returnRate, years, currency]);

  const finalValue = result?.projection[result.projection.length - 1]?.value ?? 0;

  return (
    <section className="card scenario-lab" data-testid="monthly-contribution-projection">
      <header className="card__header">
        <div>
          <span className="badge badge--accent">Extra Credit</span>
          <h2>Monthly Contribution Projection</h2>
        </div>
        <p className="muted">
          This extra-credit chart assumes the Active Investments amount is contributed every month.
          It defaults to the same 7% and 15-year assumptions, but uses a recurring monthly
          contribution formula instead of a single starting amount.
        </p>
      </header>

      <div className="scenario-controls">
        <label className="field">
          <span className="field__label">
            Annual return: <strong>{(returnRate * 100).toFixed(1)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={0.20}
            step={0.005}
            value={returnRate}
            onChange={(e) => setReturnRate(Number(e.target.value))}
            aria-label="Monthly contribution annual return rate"
          />
        </label>

        <label className="field">
          <span className="field__label">
            Time horizon: <strong>{years} years</strong>
          </span>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-label="Monthly contribution years"
          />
        </label>
      </div>

      {loading && <p className="muted">Calculating…</p>}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {result && !loading && (
        <>
          <div className="scenario-summary">
            <div>
              <div className="muted">Monthly contribution</div>
              <div className="scenario-summary__value">
                {formatUsd(result.monthlyContribution)}
              </div>
            </div>
            <div>
              <div className="muted">Annual return</div>
              <div className="scenario-summary__value">
                {(result.annualReturnRate * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="muted">Time horizon</div>
              <div className="scenario-summary__value">{result.years} years</div>
            </div>
            <div>
              <div className="muted">Projected value at year {result.years}</div>
              <div className="scenario-summary__value scenario-summary__value--accent">
                {formatUsd(finalValue)}
              </div>
            </div>
          </div>

          <div className="chart-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={result.projection}
                margin={{ top: 10, right: 24, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis
                  dataKey="year"
                  tickFormatter={(y: number) => `Y${y}`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatUsd(v)}
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [formatUsd(value), 'Value']}
                  labelFormatter={(label: number) => `Year ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Monthly contribution value"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <p className="muted">Enter a bank net value above to see the projection.</p>
      )}
    </section>
  );
}
