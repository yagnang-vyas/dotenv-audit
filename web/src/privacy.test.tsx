import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAt, results, runAudit, setText, within } from './test/render.tsx';

/**
 * Mirrors the CLI's privacy suite: fill every input with marker values, drive
 * every view, and fail if a marker reaches the results, a report, the
 * clipboard, browser storage, the console or the network.
 */
const MARKER = 'PRIVACY_MARKER';
const env = `DATABASE_URL=postgres://${MARKER}_1@db/app
PORT=${MARKER}_2
API_KEY=${MARKER}_3
UNKNOWN=${MARKER}_5
${MARKER}_6 not an assignment
DUP=${MARKER}_7
DUP=${MARKER}_8
EMPTY=
SECRET_TOKEN=<${MARKER}_13>
TOKEN="${MARKER}_4
`;
const example = `DATABASE_URL=${MARKER}_9\nPORT=\nAPI_KEY=\nMISSING=${MARKER}_10\nDUP=\nEMPTY=\nSECRET_TOKEN=\n`;
const schema = `{"variables":{"PORT":{"type":"port"},"API_KEY":{"type":"string","minLength":64,"pattern":"^sk_"},"DATABASE_URL":{"type":"url","protocols":["https"]}}}`;
const other = `DATABASE_URL=${MARKER}_11\nPORT=${MARKER}_2\nEXTRA=${MARKER}_12\n`;

const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];
let network: ReturnType<typeof vi.fn>;
let clipboard: string[];

beforeEach(() => {
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
  }
  network = vi.fn();
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('XMLHttpRequest', network);
  Object.defineProperty(navigator, 'sendBeacon', { value: network, configurable: true });
  clipboard = [];
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation((text) => {
    clipboard.push(text);
    return Promise.resolve();
  });
});

afterEach(() => {
  consoleSpies.length = 0;
});

function expectNoMarker(text: string | null | undefined): void {
  expect(text ?? '').not.toContain(MARKER);
}

async function visitEveryView(): Promise<void> {
  const panel = within(results());
  for (const summary of panel.queryAllByRole('listitem')) fireEvent.click(summary);
  expectNoMarker(results().textContent);
  for (const tab of panel.getAllByRole('tab')) {
    fireEvent.click(tab);
    expectNoMarker(results().textContent);
  }
  fireEvent.click(panel.getByRole('tab', { name: 'Report' }));
  fireEvent.click(panel.getByRole('button', { name: 'Copy report' }));
  fireEvent.click(panel.getByRole('button', { name: 'JSON' }));
  expectNoMarker(results().textContent);
  fireEvent.click(panel.getByRole('button', { name: 'Copy report' }));
  fireEvent.click(panel.getByRole('tab', { name: /Findings/ }));
  fireEvent.click(panel.getByRole('button', { name: 'Copy the shown findings as text' }));
  await vi.waitFor(() => expect(clipboard.length).toBeGreaterThanOrEqual(3));
}

function expectNothingLeaked(): void {
  for (const text of clipboard) expectNoMarker(text);
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) ?? '';
      expectNoMarker(key + (storage.getItem(key) ?? ''));
    }
  }
  expectNoMarker(document.cookie);
  expectNoMarker(document.title);
  expectNoMarker(window.location.href);
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
}

describe('privacy', () => {
  it('check never exposes values', async () => {
    renderAt('/playground');
    setText('Environment file', env);
    setText('Reference', example);
    fireEvent.click(screen.getByRole('tab', { name: /Schema/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Validate with this schema/ }));
    setText('Reference', schema);
    await runAudit();
    expect(within(results()).getByText('Audit failed')).toBeInTheDocument();
    // Every finding kind the browser can produce for check is present.
    const ids = within(results())
      .getAllByText(/^ENV0\d\d$/)
      .map((node) => node.textContent);
    expect(new Set(ids)).toEqual(
      new Set(['ENV001', 'ENV002', 'ENV003', 'ENV004', 'ENV005', 'ENV006', 'ENV009']),
    );
    await visitEveryView();
    expectNothingLeaked();
  });

  it('diff never exposes values', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('button', { name: /Compare/ }));
    setText('File A', env);
    setText('File B', other);
    await runAudit();
    await visitEveryView();
    expectNothingLeaked();
  });

  it('a schema usage error does not echo the schema', async () => {
    renderAt('/playground');
    fireEvent.click(screen.getByRole('tab', { name: /Schema/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Validate with this schema/ }));
    setText('Reference', `{"variables": ${MARKER}`);
    await runAudit();
    expectNoMarker(results().textContent);
    expectNothingLeaked();
  });
});
