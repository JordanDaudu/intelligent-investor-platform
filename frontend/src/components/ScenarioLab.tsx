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
import { useCurrency } from '../currency/CurrencyContext';

interface ScenarioLabProps {
  defaultMonthlyInvestment: number;
}

function buildProjection(
  investment: number,
  annualReturnRate: number,
  years: number,
): ProjectionPoint[] {
  const out: ProjectionPoint[] = [];
  for (let n = 1; n <= years; n++) {
    const value = investment * Math.pow(1 + annualReturnRate, n);
    out.push({ year: n, value: Math.round(value * 100) / 100 });
  }
  return out;
}

export default function ScenarioLab({ defaultMonthlyInvestment }: ScenarioLabProps) {
  const { format: formatUsd } = useCurrency();
  const [returnRate, setReturnRate] = useState(0.07);
  const [years, setYears] = useState(15);
  const [override, setOverride] = useState<number | ''>('');

  const investment = override === '' ? defaultMonthlyInvestment : Number(override);

  const data = useMemo(
    () => buildProjection(investment, returnRate, years),
    [investment, returnRate, years],
  );

  const finalValue = data[data.length - 1]?.value ?? 0;

  return (
    <section className="card scenario-lab">
      <header className="card__header">
        <div>
          <span className="badge badge--optional">Optional</span>
          <h2>Scenario Lab</h2>
        </div>
        <p className="muted">
          Explore how different return rates and time horizons change the outcome.
          The required <strong>7% / 15-year</strong> chart above remains the official projection.
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
            aria-label="Annual return rate"
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
            aria-label="Years"
          />
        </label>

        <label className="field">
          <span className="field__label">Monthly investment override</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={override}
            placeholder={String(defaultMonthlyInvestment)}
            onChange={(e) => {
              const v = e.target.value;
              setOverride(v === '' ? '' : Number(v));
            }}
          />
        </label>
      </div>

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

      <div className="chart-card__chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
            <XAxis dataKey="year" tickFormatter={(y: number) => `Y${y}`} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => formatUsd(v)} tick={{ fontSize: 12 }} width={80} />
            <Tooltip
              formatter={(value: number) => [formatUsd(value), 'Value']}
              labelFormatter={(label: number) => `Year ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Scenario value"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
