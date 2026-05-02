import { useCallback, useEffect, useMemo, useState } from 'react';
import SalaryForm, { type SalaryFormValues } from '../components/SalaryForm';
import BucketBreakdown from '../components/BucketBreakdown';
import ProjectionChart from '../components/ProjectionChart';
import SavedProfiles from '../components/SavedProfiles';
import HealthStatusCard from '../components/HealthStatusCard';
import ScenarioLab from '../components/ScenarioLab';
import { investorApi } from '../api/investorApi';
import type { FinancialProfile } from '../types/api';

const ANNUAL_RATE = 0.07;
const YEARS = 15;

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface BucketsT {
  fixedCosts: number;
  savingsGoals: number;
  activeInvestments: number;
  guiltFreeSpending: number;
}

function computeBuckets(bankNet: number): BucketsT {
  const safe = Number.isFinite(bankNet) && bankNet > 0 ? bankNet : 0;
  return {
    fixedCosts: round2(safe * 0.55),
    savingsGoals: round2(safe * 0.10),
    activeInvestments: round2(safe * 0.10),
    guiltFreeSpending: round2(safe * 0.275),
  };
}

function computeProjection(
  investment: number,
  rate = ANNUAL_RATE,
  years = YEARS,
): { year: number; value: number }[] {
  const safe = Number.isFinite(investment) && investment > 0 ? investment : 0;
  return Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    return { year, value: round2(safe * Math.pow(1 + rate, year)) };
  });
}

export default function DashboardPage() {
  const [values, setValues] = useState<SalaryFormValues>({
    name: '',
    grossSalary: 0,
    bankNet: 0,
  });
  const [profiles, setProfiles] = useState<FinancialProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buckets = useMemo(() => computeBuckets(values.bankNet), [values.bankNet]);
  const projection = useMemo(
    () => computeProjection(buckets.activeInvestments),
    [buckets.activeInvestments],
  );

  const refreshProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const data = await investorApi.listProfiles();
      setProfiles(data);
    } catch (e) {
      setProfilesError(e instanceof Error ? e.message : 'Failed to load profiles');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const onEstimateBankNet = () => {
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
      });
      await refreshProfiles();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onLoadProfile = (p: FinancialProfile) => {
    setValues({
      name: p.name,
      grossSalary: Number(p.grossSalary),
      bankNet: Number(p.bankNet),
    });
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

      <BucketBreakdown buckets={buckets} />

      <ProjectionChart
        data={projection}
        annualReturnRate={ANNUAL_RATE}
        years={YEARS}
      />

      <ScenarioLab defaultMonthlyInvestment={buckets.activeInvestments} />

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
