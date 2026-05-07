import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import { CurrencyProvider } from './currency/CurrencyContext';

type Theme = 'light' | 'dark';
const THEME_KEY = 'iip:theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage may be unavailable (e.g. private mode); fail silently.
    }
  }, [theme]);

  return (
    <CurrencyProvider>
      <Layout theme={theme} onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        <DashboardPage />
      </Layout>
    </CurrencyProvider>
  );
}
