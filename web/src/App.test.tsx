import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAt } from './test/render.tsx';

describe('App', () => {
  it('renders the landing page with a live preview from the real engine', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Audit your .env files');
    const preview = screen.getByRole('list', { name: 'Sample findings' });
    expect(within(preview).getByText('required key is missing')).toBeInTheDocument();
    expect(screen.getByText(/9 errors, 1 warning, 0 notes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Try the playground/ })).toHaveAttribute(
      'href',
      '/playground',
    );
    expect(screen.getByText('Open source, MIT licensed')).toBeInTheDocument();
  });

  it('navigates between pages without reloading', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('link', { name: /Try the playground/ }));
    expect(window.location.pathname).toBe('/playground');
    expect(screen.getByRole('heading', { level: 1, name: 'Playground' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Docs' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
  });

  it('documents every finding and the CLI-only scan command', () => {
    renderAt('/docs');
    for (let index = 1; index <= 11; index += 1) {
      expect(screen.getAllByText(`ENV${String(index).padStart(3, '0')}`).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('CLI only')).toHaveLength(2);
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('stores only the theme choice', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /Switch to (dark|light) theme/ }));
    expect(Object.keys(window.localStorage)).toEqual(['dotenv-audit:theme']);
    expect(['light', 'dark']).toContain(window.localStorage.getItem('dotenv-audit:theme'));
  });
});
