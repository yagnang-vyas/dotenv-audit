import { useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { DocsPage } from './pages/DocsPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PlaygroundPage } from './pages/PlaygroundPage.tsx';
import { routeFor, usePathname, useScrollOnNavigate } from './router.tsx';

const TITLES = {
  home: 'dotenv-audit: audit .env files without revealing values',
  playground: 'Playground · dotenv-audit',
  docs: 'Documentation · dotenv-audit',
  'not-found': 'Page not found · dotenv-audit',
} as const;

export function App() {
  const pathname = usePathname();
  const route = routeFor(pathname);
  useScrollOnNavigate(pathname);
  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);

  return (
    <Layout route={route}>
      {route === 'home' && <HomePage />}
      {route === 'playground' && <PlaygroundPage />}
      {route === 'docs' && <DocsPage />}
      {route === 'not-found' && <NotFoundPage />}
    </Layout>
  );
}
