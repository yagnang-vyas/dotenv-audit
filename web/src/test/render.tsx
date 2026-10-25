import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../App.tsx';

export function renderAt(path: string) {
  window.history.replaceState(null, '', path);
  return render(<App />);
}

export function editor(name: string): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name });
}

export function setText(name: string, text: string): void {
  fireEvent.change(editor(name), { target: { value: text } });
}

export async function runAudit(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }));
    await Promise.resolve();
  });
}

export function results(): HTMLElement {
  return screen.getByRole('region', { name: 'Audit results' });
}

export { within };
