import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './Button.tsx';

type State = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
  label?: string;
  /** Accessible name when the visible label is hidden or ambiguous. */
  ariaLabel?: string;
  size?: 'sm' | 'md';
  variant?: 'secondary' | 'ghost';
  iconOnly?: boolean;
}

/** Copies text to the clipboard. Only ever given value-free text. */
export function CopyButton({
  text,
  label = 'Copy',
  ariaLabel,
  size = 'sm',
  variant = 'secondary',
  iconOnly = false,
}: CopyButtonProps) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  const visible = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label;
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => void copy()}
      aria-label={iconOnly ? (ariaLabel ?? label) : ariaLabel}
      title={iconOnly ? (ariaLabel ?? label) : undefined}
    >
      {state === 'copied' ? <Check aria-hidden /> : <Copy aria-hidden />}
      {iconOnly ? <span className="sr-only">{visible}</span> : <span>{visible}</span>}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </Button>
  );
}
