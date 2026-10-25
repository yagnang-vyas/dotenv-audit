import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export type Route = 'home' | 'playground' | 'docs' | 'not-found';

const ROUTES: Readonly<Record<string, Route>> = {
  '/': 'home',
  '/playground': 'playground',
  '/docs': 'docs',
};

export function routeFor(pathname: string): Route {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTES[normalised] ?? 'not-found';
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
  for (const listener of listeners) listener();
}

/** Current pathname, kept in sync with history navigation. */
export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}

/** Scrolls to the hash target after navigation, or to the top of the page. */
export function useScrollOnNavigate(pathname: string): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id === '' ? null : document.getElementById(id);
    if (target !== null) target.scrollIntoView();
    else window.scrollTo?.(0, 0);
  }, [pathname]);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/** An in-app link: a real <a href> that navigates without reloading. */
export function Link({ to, onClick, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...props} />;
}
