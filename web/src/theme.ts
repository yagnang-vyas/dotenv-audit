import { useCallback, useState } from 'react';

const STORAGE_KEY = 'dotenv-audit:theme';

export type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Light/dark theme. The choice is the only thing this site ever writes to
 * browser storage, and storage failures (private mode, blocked) are ignored.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable; the theme still applies for this visit.
    }
    setTheme(next);
  }, []);
  return { theme, toggle };
}
