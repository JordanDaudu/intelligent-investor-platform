import BucketCard from './BucketCard';
import type { BucketBreakdown as BucketsT } from '../types/api';

interface BucketBreakdownProps {
  buckets: BucketsT;
  /** Fixed Costs ratio as a percentage (e.g. 55 = 55%). Defaults to 55. */
  fixedCostsPercent?: number;
  /** Guilt-Free Spending ratio as a percentage (e.g. 27.5 = 27.5%). Defaults to 27.5. */
  guiltFreeSpendingPercent?: number;
}

export default function BucketBreakdown({
  buckets,
  fixedCostsPercent = 55,
  guiltFreeSpendingPercent = 27.5,
}: BucketBreakdownProps) {
  return (
    <section className="bucket-grid" aria-label="Spending buckets">
      <BucketCard
        label="Fixed Costs"
        ratio={fixedCostsPercent / 100}
        amount={buckets.fixedCosts}
        description="Rent, utilities, transport, groceries, debt minimums."
        accent="fixed"
        testId="bucket-fixed"
      />
      <BucketCard
        label="Savings Goals"
        ratio={0.10}
        amount={buckets.savingsGoals}
        description="Emergency fund, vacations, a down payment."
        accent="savings"
        testId="bucket-savings"
      />
      <BucketCard
        label="Active Investments"
        ratio={0.10}
        amount={buckets.activeInvestments}
        description="Index funds, retirement contributions, brokerage."
        accent="investments"
        testId="bucket-investments"
      />
      <BucketCard
        label="Guilt-Free Spending"
        ratio={guiltFreeSpendingPercent / 100}
        amount={buckets.guiltFreeSpending}
        description="Dining out, hobbies, entertainment — enjoy it."
        accent="guilt-free"
        testId="bucket-guilt"
      />
    </section>
  );
}
