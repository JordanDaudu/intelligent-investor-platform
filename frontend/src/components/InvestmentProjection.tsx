import { useMemo, useState } from 'react';
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
import type { ProjectionPoint } from '../types/api';

interface InvestmentProjectionProps {
  defaultInvestmentAmount: number;
}

const DEFAULT_RETURN = 0.07;
const DEFAULT_YEARS = 15;

const formatUsd = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

function buildProjection(
  investment: number,
  annualReturnRate: number,
  years: number,
): ProjectionPoint[] {
  const out: ProjectionPoint[] = [];
  for (let n = 1; n <= years; n++) {
    out.push({ year: n, value: Math.round(investment * Math.pow(1 + annualReturnRate, n) * 100) / 100 });
  }
  return out;
}

export default function InvestmentProjection({ defaultInvestmentAmount }: InvestmentProjectionProps) {
  const [returnRate, setReturnRate] = useState(DEFAULT_RETURN);
  const [years, setYears] = useState(DEFAULT_YEARS);
  const [override, setOverride] = useState<number | ''>('');

  const isDefault = returnRate === DEFAULT_RETURN && years === DEFAULT_YEARS;
  const investment = override === '' ? defaultInvestmentAmount : Number(override);

  const data = useMemo(
    () => buildProjection(investment, returnRate, years),
    [investment, returnRate, years],
  );

  const finalValue = data[data.length - 1]?.value ?? 0;

  const handleReset = () => {
    setReturnRate(DEFAULT_RETURN);
    setYears(DEFAULT_YEARS);
  };

  return (
    <section className="card chart-card" data-testid="investment-projection">
      <header className="card__header">
        <div>
          <span
            className={isDefault ? 'badge badge--default' : 'badge badge--scenario'}
            data-testid="projection-mode-badge"
          >
            {isDefault ? 'Assignment Default' : 'Scenario Mode'}
          </span>
          <h2>Investment Projection</h2>
        </div>
        <p className="muted">
          Defaults match the required assignment projection: Active Investments compounded
          once over 15 years at 7% annual return. Use the sliders for optional scenario modeling.
        </p>
      </header>

      <div className="scenario-controls">
        <label className="field">
          <span className="field__label">
            Annual return: <strong data-testid="return-rate-display">{(returnRate * 100).toFixed(1)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={0.20}
            step={0.005}
            value={returnRate}
            onChange={(e) => setReturnRate(Number(e.target.value))}
            aria-label="Annual return rate"
          />
        </label>

        <label className="field">
          <span className="field__label">
            Time horizon: <strong data-testid="years-display">{years} years</strong>
          </span>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-label="Years"
          />
        </label>

        <label className="field">
          <span className="field__label">Starting investment amount</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={override}
            placeholder={String(defaultInvestmentAmount)}
            onChange={(e) => {
              const v = e.target.value;
              setOverride(v === '' ? '' : Number(v));
            }}
          />
        </label>
      </div>

      {!isDefault && (
        <div style={{ marginBottom: '12px' }}>
          <button
            className="btn btn--sm btn--ghost"
            onClick={handleReset}
            data-testid="reset-to-default"
          >
            Reset to assignment default
          </button>
        </div>
      )}

      <div className="scenario-summary">
        <div>
          <div className="muted">Investment used</div>
          <div className="scenario-summary__value">{formatUsd(investment)}</div>
        </div>
        <div>
          <div className="muted">Projected value at year {years}</div>
          <div className="scenario-summary__value scenario-summary__value--accent">
            {formatUsd(finalValue)}
          </div>
        </div>
      </div>

      <div className="chart-card__chart" role="img" aria-label="Investment projection chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
            <XAxis
              dataKey="year"
              tickFormatter={(y: number) => `Y${y}`}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={(v: number) => formatUsd(v)} tick={{ fontSize: 12 }} width={80} />
            <Tooltip
              formatter={(value: number) => [formatUsd(value), 'Value']}
              labelFormatter={(label: number) => `Year ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Projected value"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
