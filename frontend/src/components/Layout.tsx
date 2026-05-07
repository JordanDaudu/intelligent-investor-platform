import type { PropsWithChildren } from 'react';
import ThemeToggle from './ThemeToggle';
import CurrencySelector from './CurrencySelector';

interface LayoutProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Layout({ theme, onToggleTheme, children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-brand">
            <img src="/logo.png" alt="Intelligent Investor logo" className="app-brand__mark" />
            <div>
              <div className="app-brand__title">Intelligent Investor</div>
              <div className="app-brand__subtitle">
                Common Sense Spending · 15-Year Wealth Projection
              </div>
            </div>
          </div>
          <div className="app-header__controls">
            <CurrencySelector />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="app-footer__logo-wrap" aria-label="JD brand logo">
          <img src="/JD-logo-light.png" alt="" className={`app-footer__logo app-footer__logo--light${theme === 'light' ? ' is-visible' : ''}`} />
          <img src="/JD-logo-dark.png"  alt="" className={`app-footer__logo app-footer__logo--dark${theme === 'dark'  ? ' is-visible' : ''}`} />
        </div>
        <span>Intelligent Investor Platform · Full-stack DevOps Final Assignment</span>
      </footer>
    </div>
  );
}
