'use client';

import { useEffect, useState } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SwapState } from '@/hooks/useSwapMachine';
import type { QuoteResponse } from '@/lib/near-intents';
import { formatUsd, formatZec } from '@/lib/amount';
import { chunkAddress } from '@/lib/deposit';
import { PriceDetails, quoteFigures } from '../PriceDetails';
import { ZecAddressBadge } from '../ZecAddressField';
import { Spinner } from '../ui';

function AddressChunks({ address }: { address: string }) {
  const chunks = chunkAddress(address);
  return (
    <p className="term !text-[0.8125rem] break-all leading-relaxed">
      {chunks.map((c, i) => (
        <span key={i} className={i < 2 || i >= chunks.length - 2 ? 'text-primary font-medium' : 'text-secondary'}>
          {c}
          {i < chunks.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}

export function ReviewView({
  state,
  preview,
  refreshMs,
  mode,
  walletName,
  refundAddress,
  onBack,
  onConfirm,
}: {
  state: SwapState;
  preview: { data: QuoteResponse | null; loading: boolean; error: string | null; fetchedAt: number | null };
  refreshMs: number;
  mode: 'wallet' | 'manual';
  walletName: string | null;
  refundAddress: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const t = state.selectedToken;
  const shown = state.rateChanged && state.binding ? state.binding.response : preview.data;
  const q = shown?.quote;
  const busy = state.view === 'locking' || state.view === 'signing';
  const f = shown ? quoteFigures(shown, t) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshIn = preview.fetchedAt ? Math.max(0, Math.ceil((preview.fetchedAt + refreshMs - now) / 1000)) : null;

  const confirmLabel =
    state.view === 'locking'
      ? 'Locking quote…'
      : state.view === 'signing'
        ? `Confirm in ${walletName ?? 'your wallet'}…`
        : state.rateChanged
          ? 'Accept new rate'
          : mode === 'wallet'
            ? `Confirm and send with ${walletName ?? 'wallet'}`
            : 'Confirm and get deposit address';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} disabled={busy} className="text-sm text-muted hover:text-primary transition-colors disabled:opacity-40">
          ← Edit
        </button>
        <span className="term text-muted" aria-live="polite">
          {preview.loading ? 'refreshing quote…' : refreshIn != null && !state.rateChanged ? `quote refreshes in ${refreshIn}s` : ''}
        </span>
      </div>

      <div className="panel px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <TokenChainIcon token={t.token} chain={t.chain} size={32} />
          <div className="min-w-0">
            <div className="text-xs text-muted">You send</div>
            <div className="font-mono text-2xl text-primary tabular-nums truncate">
              {state.amount} <span className="text-secondary text-lg">{t.token}</span>
            </div>
            <div className="text-xs text-muted">on {t.chainLabel}{q ? ` · ≈ ${formatUsd(q.amountInUsd)}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TokenChainIcon token="zec" chain="zec" size={32} />
          <div className="min-w-0">
            <div className="text-xs text-muted">You receive (estimated)</div>
            <div className="font-mono text-2xl text-primary tabular-nums truncate">
              {q ? formatZec(q.amountOutFormatted, 6) : '—'} <span className="text-secondary text-lg">ZEC</span>
            </div>
            <div className="text-xs text-muted">{q ? `≈ ${formatUsd(q.amountOutUsd)}` : ''}</div>
          </div>
        </div>
        {f && (
          <dl className="grid grid-cols-3 gap-2 pt-3 border-t border-glass-4">
            <div>
              <dt className="text-xs text-muted">Minimum</dt>
              <dd className="term !text-[0.8125rem] text-secondary">{f.minOut} ZEC</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total cost</dt>
              <dd className={`term !text-[0.8125rem] ${f.costPct != null && f.costPct > 3 ? 'text-cipher-orange' : 'text-secondary'}`}>
                {f.costPct != null ? `${f.costPct.toFixed(2)}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Time</dt>
              <dd className="term !text-[0.8125rem] text-secondary">{f.eta}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="panel px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-secondary">To your ZEC address</span>
          <ZecAddressBadge address={state.zecAddress} />
        </div>
        <AddressChunks address={state.zecAddress} />
        <p className="text-xs text-muted">Check the highlighted start and end against your wallet.</p>
        {refundAddress && (
          <div className="pt-2 mt-1 border-t border-glass-4">
            <div className="text-sm text-secondary">Refunds go to ({t.chainLabel})</div>
            <p className="term text-secondary break-all">{refundAddress}</p>
          </div>
        )}
      </div>

      <PriceDetails quote={shown} token={t} zecAddress={state.zecAddress} slippageBps={state.slippageBps} />

      {state.rateChanged && (
        <p role="alert" className="px-3 py-2 rounded-xl bg-cipher-orange/[0.06] border border-cipher-orange/25 text-sm text-cipher-orange">
          The rate moved while you were reviewing. The numbers above are the new locked quote.
        </p>
      )}
      {state.error && (
        <p role="alert" className="px-3 py-2 rounded-xl bg-danger/[0.06] border border-danger/20 text-sm text-danger">
          {state.error}
        </p>
      )}
      {preview.error && !state.rateChanged && (
        <p role="alert" className="text-sm text-cipher-orange">{preview.error}</p>
      )}

      <button type="button" className="btn-primary" disabled={busy || !q} onClick={onConfirm}>
        <span className="inline-flex items-center justify-center gap-2">
          {busy && <Spinner className="w-4 h-4" />}
          {confirmLabel}
        </span>
      </button>
      <p className="text-center text-xs text-muted leading-relaxed">
        {mode === 'wallet'
          ? 'Your wallet will ask you to send to a one-time NEAR Intents deposit address.'
          : 'You’ll get a one-time deposit address. Nothing moves until you send to it.'}
      </p>
    </div>
  );
}
