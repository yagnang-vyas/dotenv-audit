import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { editor, renderAt, results, runAudit, setText, within } from '../../test/render.tsx';

describe('Playground', () => {
  it('opens with a completed audit of the synthetic sample', () => {
    renderAt('/playground');
    const panel = within(results());
    expect(panel.getByText('Audit failed')).toBeInTheDocument();
    expect(panel.getByText('5 errors, 2 warnings, 0 notes.', { exact: false })).toBeInTheDocument();
    expect(panel.getByRole('list', { name: 'Findings' })).toBeInTheDocument();
    expect(
      screen.getByText('dotenv-audit check --env .env --example .env.example'),
    ).toBeInTheDocument();
  });

  it('reports missing keys after the env file is edited and re-run', async () => {
    renderAt('/playground');
    setText('Environment file', 'DATABASE_URL=postgres://localhost/app\n');
    expect(within(results()).getByText(/inputs changed after this audit ran/)).toBeInTheDocument();
    await runAudit();
    const panel = within(results());
    expect(panel.queryByText(/inputs changed/)).not.toBeInTheDocument();
    expect(panel.getAllByText('required key is missing')).toHaveLength(6);
  });

  it('only reports a clean audit after the checks completed', async () => {
    renderAt('/playground');
    setText('Environment file', 'A=1\n');
    fireEvent.click(screen.getByRole('tab', { name: /Example file/ }));
    setText('Reference', 'A=\n');
    await runAudit();
    const panel = within(results());
    expect(panel.getByText('Audit passed with no findings')).toBeInTheDocument();
    expect(panel.getByText(/Checked 1 key across \.env\./)).toBeInTheDocument();
  });

  it('shows a usage error instead of results for an invalid schema', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('tab', { name: /Schema/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Validate with this schema/ }));
    setText('Reference', '{ not json');
    await runAudit();
    const alert = within(results()).getByRole('alert');
    expect(alert).toHaveTextContent('env.schema.json: invalid JSON');
    expect(within(results()).queryByText(/Audit passed/)).not.toBeInTheDocument();
  });

  it('refuses to check without an example file or schema', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('checkbox', { name: /Check against this example file/ }));
    await runAudit();
    expect(within(results()).getByRole('alert')).toHaveTextContent(
      'provide an example file, a schema, or both',
    );
  });

  it('filters findings by severity', async () => {
    renderAt('/playground');
    await runAudit();
    fireEvent.click(within(results()).getByRole('button', { name: /^Warnings/ }));
    const items = within(within(results()).getByRole('list', { name: 'Findings' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
  });

  it('compares two files without showing values', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    await runAudit();
    const panel = within(results());
    fireEvent.click(panel.getByRole('tab', { name: 'Comparison' }));
    const table = panel.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'SMTP_HOST' })).toBeInTheDocument();
    expect(within(table).getAllByText('Value differs')).toHaveLength(4);
    expect(table.textContent).not.toContain('smtp.example.test');
  });

  it('copies the CLI text report', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderAt('/playground');
    fireEvent.click(within(results()).getByRole('tab', { name: 'Report' }));
    fireEvent.click(within(results()).getByRole('button', { name: 'Copy report' }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toMatch(/5 errors, 2 warnings, 0 notes\n$/);
  });

  it('clears an editor and resets the playground', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('button', { name: 'Clear Environment file' }));
    expect(editor('Environment file').value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await Promise.resolve();
    expect(editor('Environment file').value).toContain('PORT=three-thousand');
  });

  it('runs with Ctrl+Enter from an editor', async () => {
    renderAt('/playground');
    setText('Environment file', 'API_KEY=changeme\n');
    fireEvent.keyDown(editor('Environment file'), { key: 'Enter', ctrlKey: true });
    await vi.waitFor(() =>
      expect(
        within(results()).getByText('placeholder value for a secret-looking key'),
      ).toBeInTheDocument(),
    );
  });
});

describe('Keys view', () => {
  it('groups problem keys by finding', () => {
    renderAt('/playground');
    const panel = within(results());
    fireEvent.click(panel.getByRole('tab', { name: 'Keys' }));
    const missing = panel.getByRole('region', { name: 'Missing keys' });
    expect(
      within(missing)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['ADMIN_EMAIL', 'DEBUG']);
    expect(
      within(panel.getByRole('region', { name: 'Unexpected keys' })).getByText('FEATURE_FLAGS'),
    ).toBeInTheDocument();
  });
});
