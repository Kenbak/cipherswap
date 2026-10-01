'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SourceToken } from './types';
import { CheckIcon, ChevronIcon, Modal, Spinner } from './ui';

interface TokenPickerProps {
  tokens: SourceToken[];
  selected: SourceToken;
  loading: boolean;
  onSelect: (token: SourceToken) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenPicker({ tokens, selected, loading, onSelect, open, onOpenChange }: TokenPickerProps) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) => t.token.toLowerCase().includes(q) || t.chainLabel.toLowerCase().includes(q) || t.chain.includes(q),
    );
  }, [tokens, search]);

  const close = () => {
    setSearch('');
    setActive(0);
    onOpenChange(false);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (t: SourceToken) => {
    onSelect(t);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        className="shrink-0 flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-md bg-glass-6 hover:bg-glass-12 border border-glass-8 transition-colors"
      >
        <TokenChainIcon token={selected.token} chain={selected.chain} size={28} />
        <span className="text-left leading-tight">
          <span className="block text-base font-semibold text-primary">{selected.token}</span>
          <span className="block text-xs text-muted">{selected.chainLabel}</span>
        </span>
        <ChevronIcon className="w-4 h-4 text-muted" />
      </button>

      <Modal open={open} onClose={close} title="Send from">
        <div className="px-2 pb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
            }}
            placeholder="Search token or chain"
            aria-label="Search token or chain"
            className="w-full px-4 py-3 rounded-xl panel text-primary text-sm placeholder:text-muted focus:outline-none"
          />
        </div>
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto" role="listbox" aria-label="Tokens">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-2 text-sm text-muted">
              <Spinner />
              Loading tokens…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">No tokens match “{search}”</div>
          ) : (
            filtered.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={selected.id === t.id}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  i === active ? 'bg-glass-6' : ''
                }`}
              >
                <TokenChainIcon token={t.token} chain={t.chain} size={32} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-primary">{t.token}</span>
                  <span className="block text-xs text-muted">{t.chainLabel}</span>
                </span>
                {selected.id === t.id && <CheckIcon className="w-4 h-4 text-cipher-gold" />}
              </button>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
