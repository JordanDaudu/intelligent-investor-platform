import { useCurrency } from '../currency/CurrencyContext';

interface BucketCardProps {
  label: string;
  ratio: number;
  amount: number;
  description: string;
  accent: 'fixed' | 'savings' | 'investments' | 'guilt-free';
  testId?: string;
}

export default function BucketCard({
  label,
  ratio,
  amount,
  description,
  accent,
  testId,
}: BucketCardProps) {
  const { format } = useCurrency();
  return (
    <article className={`bucket-card bucket-card--${accent}`} data-testid={testId}>
      <header className="bucket-card__header">
        <span className="bucket-card__label">{label}</span>
        <span className="bucket-card__ratio">{(ratio * 100).toFixed(1)}%</span>
      </header>
      <div className="bucket-card__amount" data-testid={testId ? `${testId}-amount` : undefined}>
        {format(amount)}
      </div>
      <p className="bucket-card__desc">{description}</p>
    </article>
  );
}
