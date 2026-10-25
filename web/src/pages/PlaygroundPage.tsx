import { ShieldCheck } from 'lucide-react';
import { Playground } from '../components/playground/Playground.tsx';
import { Link } from '../router.tsx';

export function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Run the <code className="font-mono">check</code> and{' '}
            <code className="font-mono">diff</code> commands on pasted configuration. The samples
            are synthetic. The <code className="font-mono">scan</code> command needs git and{' '}
            <Link to="/docs#playground-vs-cli" className="underline underline-offset-2">
              runs only in the CLI
            </Link>
            .
          </p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <ShieldCheck aria-hidden className="size-4" />
          Runs in your browser. Nothing is uploaded or stored.
        </p>
      </div>
      <Playground />
    </div>
  );
}
