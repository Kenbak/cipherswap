'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSwaps, SWAP_HISTORY_EVENT, type SwapRecord } from '@/lib/swap-history';
import { STATUS_META, TERMINAL_STATUSES } from '@/lib/near-intents';

/** Swaps saved in this browser. In-progress ones are surfaced first so nobody loses track of funds. */
export function RecentSwaps() {
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = () => setSwaps(listSwaps());
    load();
    window.addEventListener(SWAP_HISTORY_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(SWAP_HISTORY_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);

  if (swaps.length === 0) return null;

  const active = swaps.filter((s) => !s.lastStatus || !TERMINAL_STATUSES.has(s.lastStatus));
  const shown = expanded ? swaps : active.slice(0, 2);

  return (
    <div className="rounded-2xl border border-glass-6 bg-[var(--color-surface-solid)]/80 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {active.length > 0 ? `${active.length} swap${active.length > 1 ? 's' : ''} in progress` : 'Recent swaps'}
          <span className="text-muted/60"> · saved in this browser</span>
        </span>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-muted hover:text-primary">
          {expanded ? 'Hide' : `History (${swaps.length})`}
        </button>
      </div>
      {shown.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {shown.map((s) => {
            const meta = s.lastStatus ? STATUS_META[s.lastStatus] : null;
            const dot =
              meta?.tone === 'success' ? 'bg-cipher-green'
                : meta?.tone === 'error' ? 'bg-danger'
                  : meta?.tone === 'warning' ? 'bg-cipher-orange'
                    : 'bg-cipher-gold motion-safe:animate-pulse';
            const qs = s.depositMemo ? `?memo=${encodeURIComponent(s.depositMemo)}` : '';
            return (
              <li key={s.depositAddress}>
                <Link
                  href={`/swap/${encodeURIComponent(s.depositAddress)}${qs}`}
                  className="flex items-center gap-2.5 px-1.5 py-1.5 -mx-1.5 rounded-lg hover:bg-glass-4 transition-colors"
                >
                  <span className={`w-1.5 h-1.5 shrink-0 ${dot}`} aria-hidden />
                  <span className="term text-secondary truncate flex-1">
                    {s.amount} {s.token} → {s.estimatedZec} ZEC
                  </span>
                  <span className="term text-muted shrink-0">{meta?.code ?? 'awaiting_deposit'}</span>
                  <span className="text-muted text-xs shrink-0" aria-hidden>→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
