import type { PropsWithChildren } from 'react';
import ThemeToggle from './ThemeToggle';

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
            <div className="app-brand__mark" aria-hidden>II</div>
            <div>
              <div className="app-brand__title">Intelligent Investor</div>
              <div className="app-brand__subtitle">
                Common Sense Spending · 15-Year Wealth Projection
              </div>
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>Intelligent Investor Platform · Full-stack DevOps Final Assignment</span>
      </footer>
    </div>
  );
}
