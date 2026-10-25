import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  COPYRIGHT,
  ISSUES_URL,
  LICENSE_NAME,
  LICENSE_URL,
  REPO_URL,
  SPEC_URL,
  VERSION,
} from '../content/project.ts';
import { Link, type Route } from '../router.tsx';
import { useTheme } from '../theme.ts';
import { GitHubIcon } from './GitHubIcon.tsx';
import { LogoMark } from './Logo.tsx';
import { Button } from './ui/Button.tsx';
import { cn } from './ui/cn.ts';

const NAV: readonly { to: string; label: string; route: Route }[] = [
  { to: '/playground', label: 'Playground', route: 'playground' },
  { to: '/docs', label: 'Docs', route: 'docs' },
];

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow dark:focus:bg-zinc-900"
      >
        Skip to content
      </a>
      <Header route={route} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Header({ route }: { route: Route }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight">
          <LogoMark />
          <span className="whitespace-nowrap">dotenv-audit</span>
        </Link>
        <span className="hidden rounded-full border border-zinc-200 px-2 py-0.5 font-mono text-[11px] text-zinc-500 sm:inline dark:border-zinc-800 dark:text-zinc-400">
          v{VERSION}
        </span>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={route === item.route ? 'page' : undefined}
              className={cn(
                'rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-2.5',
                route === item.route
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={REPO_URL}
            className="ml-1 inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="GitHub repository"
            title="GitHub repository"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="size-[18px]" />
          </a>
          <Button
            variant="ghost"
            className="size-9 px-0"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
        <p>
          {LICENSE_NAME} licensed · {COPYRIGHT}. Everything on this site runs in your browser.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Documentation
          </Link>
          <a
            href={REPO_URL}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
            rel="noopener noreferrer"
          >
            Repository
          </a>
          <a
            href={SPEC_URL}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
            rel="noopener noreferrer"
          >
            Specification
          </a>
          <a
            href={ISSUES_URL}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
            rel="noopener noreferrer"
          >
            Report an issue
          </a>
          <a
            href={LICENSE_URL}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
            rel="noopener noreferrer"
          >
            License
          </a>
        </nav>
      </div>
    </footer>
  );
}
