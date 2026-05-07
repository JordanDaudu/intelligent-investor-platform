import { useCallback, useEffect, useRef, useState } from 'react';
import SalaryForm, { type SalaryFormValues } from '../components/SalaryForm';
import BucketBreakdown from '../components/BucketBreakdown';
import SavedProfiles from '../components/SavedProfiles';
import HealthStatusCard from '../components/HealthStatusCard';
import InvestmentProjection from '../components/InvestmentProjection';
import MonthlyContributionProjection from '../components/MonthlyContributionProjection';
import AllocationControls from '../components/AllocationControls';
import { investorApi } from '../api/investorApi';
import type {
  BucketBreakdown as BucketsT,
  CalculationPreview,
  Currency,
  FinancialProfile,
} from '../types/api';
import { useCurrency } from '../currency/CurrencyContext';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const EMPTY_BUCKETS: BucketsT = {
  fixedCosts: 0,
  savingsGoals: 0,
  activeInvestments: 0,
  guiltFreeSpending: 0,
};

/** Assignment-defined midpoint defaults */
const DEFAULT_FIXED_COSTS_PCT = 55;
const DEFAULT_GUILT_FREE_PCT = 27.5;

export default function DashboardPage() {
  const { currency, setCurrency, convert } = useCurrency();
  const prevCurrency = useRef<Currency>(currency);
  /** Set true right before a programmatic setCurrency that should NOT trigger
   *  conversion of the typed values (e.g. loading a profile that's already in
   *  the target currency). Cleared by the effect after it skips one cycle. */
  const skipNextConversion = useRef(false);

  const [values, setValues] = useState<SalaryFormValues>({
    name: '',
    grossSalary: 0,
    bankNet: 0,
  });

  /** Budget Allocation Control state — drives the preview API call */
  const [fixedCostsPercent, setFixedCostsPercent] = useState(DEFAULT_FIXED_COSTS_PCT);
  const [guiltFreeSpendingPercent, setGuiltFreeSpendingPercent] = useState(DEFAULT_GUILT_FREE_PCT);

  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<FinancialProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Convert typed salary values when the user switches the active currency.
  // Skips the conversion on the very first render, on no-op currency changes,
  // and when loading a profile (which already has values in the target currency).
  useEffect(() => {
    const prev = prevCurrency.current;
    prevCurrency.current = currency;

    if (prev === currency) return;
    if (skipNextConversion.current) {
      skipNextConversion.current = false;
      return;
    }

    setValues((v) => ({
      ...v,
      grossSalary: round2(convert(v.grossSalary, prev, currency)),
      bankNet: round2(convert(v.bankNet, prev, currency)),
    }));
  }, [currency, convert]);

  useEffect(() => {
    if (values.bankNet <= 0) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);

      investorApi
        .preview({
          grossSalary: values.grossSalary,
          bankNet: values.bankNet,
          fixedCostsPercent,
          guiltFreeSpendingPercent,
          currency,
        })
        .then((data) => {
          if (!cancelled) setPreview(data);
        })
        .catch((e) => {
          if (!cancelled)
            setPreviewError(e instanceof Error ? e.message : 'Preview request failed');
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [values.grossSalary, values.bankNet, fixedCostsPercent, guiltFreeSpendingPercent, currency]);

  const refreshProfiles = useCallback(async (attempt = 0) => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const data = await investorApi.listProfiles();
      setProfiles(data);
    } catch (e) {
      const maxRetries = 4;
      if (attempt < maxRetries) {
        const delay = 1000 * 2 ** attempt;
        setTimeout(() => void refreshProfiles(attempt + 1), delay);
        return;
      }
      setProfilesError(e instanceof Error ? e.message : 'Failed to load profiles');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const onEstimateBankNet = () => {
    // Helper only — estimates take-home from gross. The bucket/projection
    // results always come from the backend preview API, not this formula.
    const estimated = round2(values.grossSalary * 0.68);
    setValues((v) => ({ ...v, bankNet: estimated }));
  };

  const onSave = async () => {
    setSaveError(null);
    if (!values.name.trim()) {
      setSaveError('Please enter a name before saving.');
      return;
    }
    if (values.grossSalary <= 0 || values.bankNet <= 0) {
      setSaveError('Gross salary and bank net must both be greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await investorApi.createProfile({
        name: values.name.trim(),
        grossSalary: values.grossSalary,
        bankNet: values.bankNet,
        fixedCostsPercent,
        guiltFreeSpendingPercent,
        currency,
      });
      await refreshProfiles();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onLoadProfile = (p: FinancialProfile) => {
    // The profile's values are already in p.currency, so when we switch the
    // active currency to match we must skip the auto-conversion effect.
    if (p.currency !== currency) {
      skipNextConversion.current = true;
      setCurrency(p.currency);
    }
    setValues({
      name: p.name,
      grossSalary: Number(p.grossSalary),
      bankNet: Number(p.bankNet),
    });
    setFixedCostsPercent(p.fixedCostsPercent ?? DEFAULT_FIXED_COSTS_PCT);
    setGuiltFreeSpendingPercent(p.guiltFreeSpendingPercent ?? DEFAULT_GUILT_FREE_PCT);
    setSaveError(null);
  };

  const onDeleteProfile = async (id: string) => {
    setProfilesError(null);
    try {
      await investorApi.deleteProfile(id);
      await refreshProfiles();
    } catch (e) {
      setProfilesError(e instanceof Error ? e.message : 'Failed to delete profile');
    }
  };

  const buckets = preview?.buckets ?? EMPTY_BUCKETS;
  // Use ratios from the backend response (reflects overrides); fall back to state
  const displayFixedPct = preview?.fixedCostsPercent ?? fixedCostsPercent;
  const displayGuiltPct = preview?.guiltFreeSpendingPercent ?? guiltFreeSpendingPercent;

  return (
    <div className="dashboard">
      <section className="hero">
        <h1>Plan your money. See it grow.</h1>
        <p>
          Enter your monthly take-home pay and we'll split it across the four{' '}
          <strong>Common Sense Spending</strong> buckets, then project 15 years of compound
          growth on the active-investments slice.
        </p>
      </section>

      <div className="dashboard__grid">
        <SalaryForm
          values={values}
          onChange={setValues}
          onEstimateBankNet={onEstimateBankNet}
          onSave={onSave}
          saving={saving}
          error={saveError}
        />
        <HealthStatusCard />
      </div>

      {previewError && !previewLoading && (
        <div className="alert alert--error" role="alert">
          Calculation error: {previewError}
        </div>
      )}

      <BucketBreakdown
        buckets={buckets}
        fixedCostsPercent={displayFixedPct}
        guiltFreeSpendingPercent={displayGuiltPct}
      />

      <AllocationControls
        bankNet={values.bankNet}
        fixedCostsPercent={fixedCostsPercent}
        guiltFreeSpendingPercent={guiltFreeSpendingPercent}
        onFixedCostsChange={setFixedCostsPercent}
        onGuiltFreeChange={setGuiltFreeSpendingPercent}
      />

      <InvestmentProjection defaultInvestmentAmount={buckets.activeInvestments} />

      <MonthlyContributionProjection defaultMonthlyContribution={buckets.activeInvestments} />

      <SavedProfiles
        profiles={profiles}
        loading={profilesLoading}
        error={profilesError}
        onLoad={onLoadProfile}
        onDelete={onDeleteProfile}
        onRefresh={() => void refreshProfiles()}
      />
    </div>
  );
}
