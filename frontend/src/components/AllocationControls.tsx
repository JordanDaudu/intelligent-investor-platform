import { useCurrency } from '../currency/CurrencyContext';

const SAVINGS_PCT = 10;
const INVESTMENTS_PCT = 10;

interface AllocationControlsProps {
  bankNet: number;
  fixedCostsPercent: number;
  guiltFreeSpendingPercent: number;
  onFixedCostsChange: (pct: number) => void;
  onGuiltFreeChange: (pct: number) => void;
}

function statusInfo(pctDiff: number): { label: string; cls: string } {
  if (Math.abs(pctDiff) < 0.01) return { label: 'Balanced ✓', cls: 'status--balanced' };
  if (pctDiff > 0) return { label: 'Over allocated', cls: 'status--over' };
  return { label: 'Under allocated', cls: 'status--under' };
}

export default function AllocationControls({
  bankNet,
  fixedCostsPercent,
  guiltFreeSpendingPercent,
  onFixedCostsChange,
  onGuiltFreeChange,
}: AllocationControlsProps) {
  const { format: fmtCurrency } = useCurrency();
  const totalPct = fixedCostsPercent + SAVINGS_PCT + INVESTMENTS_PCT + guiltFreeSpendingPercent;
  const pctDiff = totalPct - 100;
  const { label: statusLabel, cls: statusCls } = statusInfo(pctDiff);

  const totalAmount = bankNet > 0 ? (bankNet * totalPct) / 100 : 0;
  const amountDiff = bankNet > 0 ? totalAmount - bankNet : 0;

  const balancedGuiltFree = 100 - fixedCostsPercent - SAVINGS_PCT - INVESTMENTS_PCT;
  const canBalance =
    balancedGuiltFree >= 20 && balancedGuiltFree <= 35 && Math.abs(pctDiff) > 0.01;

  return (
    <section className="card allocation-controls" data-testid="allocation-controls">
      <header className="card__header">
        <h2>Budget Allocation Controls</h2>
        <p className="muted">
          The assignment defines fixed-cost and guilt-free spending as guideline ranges. The
          midpoint defaults total 102.5%, so the allocation summary shows whether the current plan
          is balanced. Use &lsquo;Balance to 100%&rsquo; to create a zero-based version while
          staying inside the assignment ranges.
        </p>
      </header>

      <div className="allocation-controls__sliders">
        <label className="field">
          <span className="field__label">
            Fixed Costs:{' '}
            <strong data-testid="fixed-pct-display">{fixedCostsPercent.toFixed(1)}%</strong>
            <span className="muted-inline"> (50%–60%)</span>
          </span>
          <input
            type="range"
            min={50}
            max={60}
            step={0.5}
            value={fixedCostsPercent}
            onChange={(e) => onFixedCostsChange(Number(e.target.value))}
            aria-label="Fixed Costs percentage"
            data-testid="slider-fixed-costs"
          />
        </label>

        <label className="field">
          <span className="field__label">
            Savings Goals: <strong>10.0%</strong>
            <span className="muted-inline"> (fixed)</span>
          </span>
          <input
            type="range"
            min={10}
            max={10}
            step={1}
            value={10}
            disabled
            aria-label="Savings Goals percentage (fixed at 10%)"
          />
        </label>

        <label className="field">
          <span className="field__label">
            Active Investments: <strong>10.0%</strong>
            <span className="muted-inline"> (fixed)</span>
          </span>
          <input
            type="range"
            min={10}
            max={10}
            step={1}
            value={10}
            disabled
            aria-label="Active Investments percentage (fixed at 10%)"
          />
        </label>

        <label className="field">
          <span className="field__label">
            Guilt-Free Spending:{' '}
            <strong data-testid="guilt-pct-display">{guiltFreeSpendingPercent.toFixed(1)}%</strong>
            <span className="muted-inline"> (20%–35%)</span>
          </span>
          <input
            type="range"
            min={20}
            max={35}
            step={0.5}
            value={guiltFreeSpendingPercent}
            onChange={(e) => onGuiltFreeChange(Number(e.target.value))}
            aria-label="Guilt-Free Spending percentage"
            data-testid="slider-guilt-free"
          />
        </label>
      </div>

      <div className="allocation-summary" data-testid="allocation-summary">
        <div className="allocation-summary__row">
          <span className="allocation-summary__label">Total allocated</span>
          <strong data-testid="alloc-total-pct">{totalPct.toFixed(1)}%</strong>
        </div>

        {bankNet > 0 && (
          <>
            <div className="allocation-summary__row">
              <span className="allocation-summary__label">Total amount</span>
              <strong data-testid="alloc-total-amount">{fmtCurrency(totalAmount)}</strong>
            </div>
            <div className="allocation-summary__row">
              <span className="allocation-summary__label">Difference from bank net</span>
              <span data-testid="alloc-diff">
                {amountDiff > 0 ? '+' : ''}
                {fmtCurrency(amountDiff)}
              </span>
            </div>
          </>
        )}

        <div className="allocation-summary__row">
          <span className="allocation-summary__label">Status</span>
          <span className={`status-badge ${statusCls}`} data-testid="alloc-status">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="allocation-actions">
        <button
          className="btn btn--ghost btn--small"
          onClick={() => canBalance && onGuiltFreeChange(balancedGuiltFree)}
          disabled={!canBalance}
          data-testid="btn-balance"
          title={
            canBalance
              ? `Sets Guilt-Free to ${balancedGuiltFree.toFixed(1)}%`
              : 'Cannot balance: result would be outside the 20%–35% assignment range'
          }
        >
          Balance to 100%
        </button>
        {canBalance && (
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            → sets Guilt-Free to {balancedGuiltFree.toFixed(1)}%
          </span>
        )}
      </div>
    </section>
  );
}
