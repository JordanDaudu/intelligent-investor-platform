import { useId } from 'react';

export interface SalaryFormValues {
  name: string;
  grossSalary: number;
  bankNet: number;
}

interface SalaryFormProps {
  values: SalaryFormValues;
  onChange: (next: SalaryFormValues) => void;
  onEstimateBankNet: () => void;
  onSave: () => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
}

const numberOrZero = (raw: string): number => {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default function SalaryForm({
  values,
  onChange,
  onEstimateBankNet,
  onSave,
  saving,
  error,
}: SalaryFormProps) {
  const nameId = useId();
  const grossId = useId();
  const netId = useId();

  return (
    <form
      className="card salary-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
    >
      <div className="card__header">
        <h2>Your finances</h2>
        <p className="muted">
          All bucket math is based on <strong>Bank Net</strong>, not gross salary.
        </p>
      </div>

      <div className="salary-form__grid">
        <label className="field salary-form__name" htmlFor={nameId}>
          <span className="field__label">Name</span>
          <input
            id={nameId}
            type="text"
            value={values.name}
            placeholder="e.g. Alex Garcia"
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            required
          />
        </label>

        <label className="field" htmlFor={grossId}>
          <span className="field__label">Gross monthly salary</span>
          <input
            id={grossId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={values.grossSalary || ''}
            placeholder="20000"
            onChange={(e) =>
              onChange({ ...values, grossSalary: numberOrZero(e.target.value) })
            }
          />
        </label>

        <label className="field" htmlFor={netId}>
          <span className="field__label">Bank net (take-home)</span>
          <div className="field__inline">
            <input
              id={netId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.bankNet || ''}
              placeholder="13600"
              onChange={(e) =>
                onChange({ ...values, bankNet: numberOrZero(e.target.value) })
              }
            />
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={onEstimateBankNet}
              title="Estimate Bank Net = Gross × 0.68"
            >
              Estimate (×0.68)
            </button>
          </div>
        </label>
      </div>

      {error ? <div className="alert alert--error" role="alert">{error}</div> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
