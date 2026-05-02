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

interface ProjectionChartProps {
  data: ProjectionPoint[];
  annualReturnRate: number;
  years: number;
  title?: string;
}

const formatUsd = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export default function ProjectionChart({
  data,
  annualReturnRate,
  years,
  title = 'Required projection — 15 years @ 7%',
}: ProjectionChartProps) {
  return (
    <section className="card chart-card" data-testid="projection-chart">
      <header className="card__header">
        <h2>{title}</h2>
        <p className="muted">
          Compound growth of your active investments at {(annualReturnRate * 100).toFixed(2)}%
          per year over {years} years.
        </p>
      </header>

      <div className="chart-card__chart" role="img" aria-label="Projection chart">
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
