import { buttonClasses } from '../components/ui/Button.tsx';
import { Link } from '../router.tsx';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-sm text-brand-700 dark:text-brand-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        There is nothing at this address. The playground and documentation are linked below.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/playground" className={buttonClasses('primary')}>
          Open the playground
        </Link>
        <Link to="/docs" className={buttonClasses('secondary')}>
          Read the docs
        </Link>
      </div>
    </section>
  );
}
