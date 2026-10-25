export function LogoMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-brand-700 dark:fill-brand-600" />
      <path d="M9 10h3M9 16h7M9 22h5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="m18.5 20.5 2.5 2.5 4.5-5"
        stroke="#5eead4"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
