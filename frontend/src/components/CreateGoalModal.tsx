import { useEffect, useId, useRef, useState } from 'react';
import type {
  CreateGoalRequest,
  FinancialGoal,
  GoalCategory,
  UpdateGoalRequest,
} from '../types/api';

type Mode = 'create' | 'edit';

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * 'create' (default): builds a CreateGoalRequest including profileId.
   * 'edit': builds an UpdateGoalRequest (profileId is not editable).
   */
  mode?: Mode;
  /** Required when mode === 'create'. Ignored otherwise. */
  profileId?: string;
  /** Required when mode === 'edit'. Used to prefill fields. */
  initial?: FinancialGoal;
  onSubmit: (input: CreateGoalRequest | UpdateGoalRequest) => Promise<void> | void;
  submitting?: boolean;
  /** Pre-populated error from the parent (e.g. backend rejection). */
  externalError?: string | null;
}

const CATEGORIES: Array<{ value: GoalCategory; label: string }> = [
  { value: 'EMERGENCY_FUND', label: 'Emergency Fund' },
  { value: 'RETIREMENT', label: 'Retirement' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'CAR', label: 'Car' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'CUSTOM', label: 'Custom' },
];

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const numberOrZero = (raw: string): number => {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const isoToDateInput = (iso: string): string => {
  if (!iso) return '';
  // Accept both date-only and full ISO strings.
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
};

export default function CreateGoalModal({
  open,
  onClose,
  mode = 'create',
  profileId,
  initial,
  onSubmit,
  submitting,
  externalError,
}: CreateGoalModalProps) {
  const titleId = useId();
  const categoryId = useId();
  const targetId = useId();
  const currentId = useId();
  const dateId = useId();
  const returnId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('CUSTOM');
  const [targetAmount, setTargetAmount] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [expectedReturn, setExpectedReturn] = useState(0.07);
  const [validation, setValidation] = useState<string | null>(null);

  // Prefill on open in edit mode (and reset to defaults in create mode).
  useEffect(() => {
    if (!open) return;
    setValidation(null);
    if (mode === 'edit' && initial) {
      setTitle(initial.title);
      setCategory(initial.category);
      setTargetAmount(initial.targetAmount);
      setCurrentAmount(initial.currentAmount);
      setTargetDate(isoToDateInput(initial.targetDate));
      setExpectedReturn(initial.expectedReturn);
    } else if (mode === 'create') {
      setTitle('');
      setCategory('CUSTOM');
      setTargetAmount(0);
      setCurrentAmount(0);
      setTargetDate('');
      setExpectedReturn(0.07);
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): string | null => {
    if (title.trim().length === 0) return 'Title is required.';
    if (targetAmount <= 0) return 'Target amount must be greater than zero.';
    if (currentAmount < 0) return 'Current amount cannot be negative.';
    if (!targetDate) return 'Target date is required.';
    const target = new Date(targetDate);
    if (Number.isNaN(target.getTime()) || target.getTime() <= Date.now()) {
      return 'Target date must be in the future.';
    }
    if (expectedReturn < 0 || expectedReturn > 1) {
      return 'Expected return must be between 0 and 1.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setValidation(err);
      return;
    }
    setValidation(null);

    if (mode === 'edit') {
      const payload: UpdateGoalRequest = {
        title: title.trim(),
        category,
        targetAmount,
        currentAmount,
        targetDate,
        expectedReturn,
      };
      await onSubmit(payload);
      return;
    }

    if (!profileId) {
      // Defensive — shouldn't happen if parent passes profileId in create mode.
      setValidation('Cannot create a goal without a selected profile.');
      return;
    }

    const payload: CreateGoalRequest = {
      profileId,
      title: title.trim(),
      category,
      targetAmount,
      currentAmount,
      targetDate,
      expectedReturn,
    };
    await onSubmit(payload);
  };

  const errorMessage = validation ?? externalError ?? null;
  const headingText = mode === 'edit' ? 'Edit financial goal' : 'Create a financial goal';
  const submitLabel =
    submitting ? 'Saving…' : mode === 'edit' ? 'Update goal' : 'Save Goal';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="create-goal-modal"
    >
      <div className="modal-dialog" ref={dialogRef}>
        <header className="modal-dialog__header">
          <h2 id={titleId}>{headingText}</h2>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <form className="modal-dialog__body" onSubmit={handleSubmit} noValidate>
          <label className="field" htmlFor={titleId + '-title'}>
            <span className="field__label">Title</span>
            <input
              id={titleId + '-title'}
              type="text"
              value={title}
              placeholder="e.g. Buy Apartment"
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="field" htmlFor={categoryId}>
            <span className="field__label">Category</span>
            <select
              id={categoryId}
              value={category}
              onChange={(e) => setCategory(e.target.value as GoalCategory)}
              className="goal-modal__select"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="goal-modal__grid">
            <label className="field" htmlFor={targetId}>
              <span className="field__label">Target amount</span>
              <input
                id={targetId}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={targetAmount || ''}
                placeholder="1000000"
                onChange={(e) => setTargetAmount(numberOrZero(e.target.value))}
              />
            </label>

            <label className="field" htmlFor={currentId}>
              <span className="field__label">Currently saved</span>
              <input
                id={currentId}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={currentAmount || ''}
                placeholder="250000"
                onChange={(e) => setCurrentAmount(numberOrZero(e.target.value))}
              />
            </label>

            <label className="field" htmlFor={dateId}>
              <span className="field__label">Target date</span>
              <input
                id={dateId}
                type="date"
                min={todayIso()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>

            <label className="field" htmlFor={returnId}>
              <span className="field__label">
                Expected annual return:{' '}
                <strong>{(expectedReturn * 100).toFixed(1)}%</strong>
              </span>
              <input
                id={returnId}
                type="range"
                min={0}
                max={0.2}
                step={0.005}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                aria-label="Expected annual return"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="alert alert--error" role="alert" data-testid="goal-modal-error">
              {errorMessage}
            </div>
          ) : null}

          <div className="modal-dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
