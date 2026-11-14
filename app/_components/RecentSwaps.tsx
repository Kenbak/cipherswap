'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSwaps, SWAP_HISTORY_EVENT, type SwapRecord } from '@/lib/swap-history';
import { STATUS_META, TERMINAL_STATUSES } from '@/lib/near-intents';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { formatZec } from '@/lib/amount';

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
  const label = active.length > 0 ? `${active.length} in progress` : 'Recent swaps';

  return (
    <div className="rounded-xl border border-glass-6 bg-[var(--color-surface-solid)]/60 px-2 py-1.5">
      {shown.length > 0 && (
        <ul className="space-y-0.5">
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
                  className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-glass-4 transition-colors"
                >
                  <TokenChainIcon token={s.token} chain={s.chain} size={18} />
                  <span className="term text-secondary truncate flex-1">
                    {formatZec(s.amount, 6)} {s.token} <span className="text-muted">→</span> {formatZec(s.estimatedZec, 6)} ZEC
                  </span>
                  <span className={`w-1.5 h-1.5 shrink-0 ${dot}`} aria-hidden />
                  <span className="term text-muted shrink-0">{meta?.code ?? 'awaiting_deposit'}</span>
                  <span className="text-muted text-xs shrink-0" aria-hidden>→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className={`flex items-center justify-between gap-2 px-1.5 ${shown.length > 0 ? 'pt-1 mt-0.5 border-t border-glass-4' : 'py-0.5'}`}>
        <span className="text-[0.6875rem] text-muted">{label} · saved in this browser</span>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[0.6875rem] text-muted hover:text-primary">
          {expanded ? 'Hide history' : `History (${swaps.length})`}
        </button>
      </div>
    </div>
  );
}
