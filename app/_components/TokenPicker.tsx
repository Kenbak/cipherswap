'use client';

import { useState, useRef, useEffect } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SourceToken } from './types';

interface TokenPickerProps {
  tokens: SourceToken[];
  selected: SourceToken;
  loading: boolean;
  onSelect: (token: SourceToken) => void;
  variant?: 'default' | 'inline';
}

export function TokenPicker({
  tokens,
  selected,
  loading,
  onSelect,
  variant = 'default',
}: TokenPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inline = variant === 'inline';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = tokens.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.token.toLowerCase().includes(q) ||
      t.chainLabel.toLowerCase().includes(q) ||
      t.chain.includes(q)
    );
  });

  return (
    <div className={`relative ${inline ? 'shrink-0' : ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch('');
        }}
        className={
          inline
            ? 'flex items-center gap-2 h-full px-3 py-2.5 border-r border-[var(--color-border-subtle)] hover:bg-[var(--color-inset)] transition-colors'
            : 'w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-glass-3 border border-glass-6 hover:border-cipher-cyan/30 transition-all'
        }
      >
        <TokenChainIcon token={selected.token} chain={selected.chain} size={inline ? 22 : 28} />
        <div className={inline ? 'text-left min-w-0' : 'flex-1 text-left'}>
          <div
            className={`font-mono font-semibold text-primary leading-tight ${
              inline ? 'text-sm' : 'text-sm'
            }`}
          >
            {selected.token}
          </div>
          {!inline && (
            <div className="text-[11px] font-mono text-muted leading-tight mt-0.5">
              {selected.chainLabel}
            </div>
          )}
        </div>
        {!inline && (
          <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider mr-1">
            Change
          </span>
        )}
        <svg
          className={`text-muted shrink-0 ${inline ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            onClick={() => {
              setOpen(false);
              setSearch('');
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select token"
            className={`fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto z-50 sm:w-[320px] max-h-[85vh] sm:max-h-[360px] rounded-t-2xl sm:rounded-lg surface-solid shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in ${
              inline ? 'sm:left-0 sm:top-full sm:mt-1' : 'sm:left-0 sm:top-full sm:mt-1'
            }`}
          >
            <div className="p-2 border-b border-[var(--color-border-subtle)]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token or chain..."
                autoFocus
                className="input-shell w-full px-3 py-2 text-primary font-mono text-sm placeholder:text-muted/40 focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-48px)] sm:max-h-[340px]">
              {loading ? (
                <div className="px-3 py-8 text-center">
                  <div className="w-5 h-5 mx-auto mb-2 rounded-full border-2 border-glass-12 border-t-cipher-cyan animate-spin" />
                  <div className="text-[11px] text-muted font-mono">Loading tokens...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs font-mono text-muted">No tokens found</div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(t);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected.id === t.id ? 'bg-[var(--color-inset)]' : 'hover:bg-[var(--color-inset)]'
                    }`}
                  >
                    <TokenChainIcon token={t.token} chain={t.chain} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-primary">{t.token}</div>
                      <div className="text-[11px] font-mono text-muted">{t.chainLabel}</div>
                    </div>
                    {selected.id === t.id && (
                      <svg
                        className="w-4 h-4 text-cipher-cyan shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
