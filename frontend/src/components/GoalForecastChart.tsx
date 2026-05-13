import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Currency, GoalProjectionPoint } from '../types/api';

interface GoalForecastChartProps {
  data: GoalProjectionPoint[];
  targetAmount: number;
  /** Currency code to format Y-axis and tooltip values in. */
  currency: Currency;
  height?: number;
}

function makeFormatter(currency: Currency): (amount: number) => string {
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    });
  } catch {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
  }
  return (amount: number) => formatter.format(Number.isFinite(amount) ? amount : 0);
}

export default function GoalForecastChart({
  data,
  targetAmount,
  currency,
  height = 220,
}: GoalForecastChartProps) {
  const format = makeFormatter(currency);

  return (
    <div className="goal-forecast-chart" data-testid="goal-forecast-chart">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
          <XAxis
            dataKey="year"
            tickFormatter={(y: number) => `Y${y}`}
            tick={{ fontSize: 11 }}
          />
          <YAxis tickFormatter={(v: number) => format(v)} tick={{ fontSize: 11 }} width={72} />
          <Tooltip
            formatter={(value: number) => [format(value), 'Projected value']}
            labelFormatter={(label: number) => `Year ${label}`}
          />
          <Legend />
          <ReferenceLine
            y={targetAmount}
            stroke="#f43f5e"
            strokeDasharray="5 4"
            label={{
              value: `Target ${format(targetAmount)}`,
              position: 'insideTopRight',
              fill: '#f43f5e',
              fontSize: 11,
            }}
          />
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
  );
}
