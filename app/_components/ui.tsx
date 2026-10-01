'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type IconProps = { className?: string };

export function CheckIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function CopyIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth={1.75} />
      <path strokeLinecap="round" strokeWidth={1.75} d="M5 15V6a2 2 0 012-2h9" />
    </svg>
  );
}

export function ExternalIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5v5M19 5l-8 8M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4" />
    </svg>
  );
}

export function ChevronIcon({ className = 'w-4 h-4', open }: IconProps & { open?: boolean }) {
  return (
    <svg
      className={`${className} transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function Spinner({ className = 'w-4 h-4' }: IconProps) {
  return <span className={`${className} inline-block rounded-full border-2 border-glass-12 border-t-cipher-gold animate-spin`} aria-hidden />;
}

export function CopyButton({
  value,
  label = 'Copy',
  className = '',
  compact = false,
}: {
  value: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('[copy] clipboard write failed:', err);
      setFailed(true);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${label}${copied ? ' (copied)' : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-colors ${
        compact ? 'p-1.5 hover:bg-glass-6' : 'px-2.5 py-1.5 text-xs bg-glass-4 hover:bg-glass-8'
      } ${copied ? 'text-cipher-green' : failed ? 'text-danger' : 'text-secondary hover:text-primary'} ${className}`}
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
      {!compact && <span>{copied ? 'Copied' : failed ? 'Copy blocked' : label}</span>}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, button:not([data-close])');
      first?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" data-close className="absolute inset-0 modal-backdrop animate-fade-in cursor-default" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} max-h-[85vh] flex flex-col swap-card rounded-b-none sm:rounded-3xl animate-scale-in`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 -mr-1.5 rounded-lg text-muted hover:text-primary hover:bg-glass-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-3 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
