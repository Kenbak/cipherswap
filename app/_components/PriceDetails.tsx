'use client';

import { useState } from 'react';
import type { QuoteResponse } from '@/lib/near-intents';
import { formatDuration } from '@/lib/near-intents';
import { formatUsd, formatZec, fromSmallestUnit, truncateDecimal } from '@/lib/amount';
import { shortAddress, zecAddressKind } from '@/lib/deposit';
import type { SourceToken } from './types';
import { ZEC_DECIMALS } from './types';
import { ChevronIcon } from './ui';

const SLIPPAGE_OPTIONS = [50, 100, 200];
const HIGH_COST_PCT = 3;

export function quoteFigures(q: QuoteResponse, token: SourceToken) {
  const inAmt = parseFloat(q.quote.amountInFormatted);
  const outAmt = parseFloat(q.quote.amountOutFormatted);
  const inUsd = parseFloat(q.quote.amountInUsd);
  const outUsd = parseFloat(q.quote.amountOutUsd);
  const rate = inAmt > 0 ? outAmt / inAmt : null;
  const costPct = inUsd > 0 && outUsd > 0 ? (1 - outUsd / inUsd) * 100 : null;
  const appFeeBps = (q.quoteRequest.appFees ?? []).reduce((s, f) => s + f.fee, 0);
  return {
    rate: rate ? `1 ${token.token} = ${rate < 0.001 ? rate.toPrecision(3) : truncateDecimal(rate.toFixed(6), 6)} ZEC` : null,
    minOut: formatZec(fromSmallestUnit(q.quote.minAmountOut, ZEC_DECIMALS), 6),
    withdrawFee: q.quote.withdrawFee ? formatZec(fromSmallestUnit(q.quote.withdrawFee, ZEC_DECIMALS), 6) : null,
    costPct,
    appFeeBps,
    appFeeUsd: inUsd > 0 ? formatUsd((inUsd * appFeeBps) / 10000) : null,
    eta: formatDuration(q.quote.timeEstimate),
  };
}

export function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-right">
        <span className="term !text-sm text-secondary">{children}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
    </div>
  );
}

export function PriceDetails({
  quote,
  token,
  zecAddress,
  slippageBps,
  onSetSlippage,
  loading,
  defaultOpen = false,
}: {
  quote: QuoteResponse | null;
  token: SourceToken;
  zecAddress: string;
  slippageBps: number;
  onSetSlippage?: (bps: number) => void;
  loading?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const f = quote ? quoteFigures(quote, token) : null;
  const kind = zecAddressKind(zecAddress);
  const destination = kind === 'transparent' ? 'ZEC (transparent)' : kind ? 'ZEC (shielded)' : 'ZEC';
  const highCost = f?.costPct != null && f.costPct > HIGH_COST_PCT;

  return (
    <div className="rounded-2xl border border-glass-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className={`term truncate ${loading ? 'text-muted animate-pulse' : 'text-secondary'}`}>
          {f ? (
            <>
              {f.rate}
              <span className="text-muted"> · fee {(f.appFeeBps / 100).toFixed(2)}% · {f.eta}</span>
            </>
          ) : (
            <span className="text-muted">route {token.chain} → near-intents → zec</span>
          )}
        </span>
        <ChevronIcon open={open} className="w-4 h-4 text-muted shrink-0" />
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-glass-4 pt-2 animate-fade-in">
          <Row label="Route">
            {token.chainLabel} → NEAR Intents → {destination}
          </Row>
          {f && (
            <>
              <Row label="Minimum received" hint="If the market moves beyond your slippage, the swap refunds.">
                {f.minOut} ZEC
              </Row>
              <Row
                label="App fee"
                hint={
                  quote?.quoteRequest.appFees?.length
                    ? `Split as quoted: ${quote.quoteRequest.appFees.map((a) => `${shortAddress(a.recipient, 10, 4)} ${(a.fee / 100).toFixed(2)}%`).join(', ')}`
                    : undefined
                }
              >
                {(f.appFeeBps / 100).toFixed(2)}%{f.appFeeUsd ? ` (${f.appFeeUsd})` : ''}
              </Row>
              {f.withdrawFee && (
                <Row label="ZEC network fee" hint="Already deducted from the amount you receive.">
                  {f.withdrawFee} ZEC
                </Row>
              )}
              {f.costPct != null && (
                <Row label="Total cost vs market" hint="All fees plus solver spread, from the quote's USD values.">
                  <span className={highCost ? 'text-cipher-orange' : ''}>{f.costPct.toFixed(2)}%</span>
                </Row>
              )}
              <Row label="Estimated time" hint="After your deposit confirms on chain.">
                {f.eta}
              </Row>
            </>
          )}
          <div className="flex items-center justify-between gap-4 py-1.5">
            <span className="text-sm text-muted">Slippage tolerance</span>
            {onSetSlippage ? (
              <div className="flex gap-1" role="radiogroup" aria-label="Slippage tolerance">
                {SLIPPAGE_OPTIONS.map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    role="radio"
                    aria-checked={slippageBps === bps}
                    onClick={() => onSetSlippage(bps)}
                    className={`px-2.5 py-1 rounded-lg term transition-colors ${
                      slippageBps === bps ? 'bg-cipher-gold/15 text-cipher-gold' : 'text-muted hover:text-secondary hover:bg-glass-6'
                    }`}
                  >
                    {bps / 100}%
                  </button>
                ))}
              </div>
            ) : (
              <span className="term !text-sm text-secondary">{slippageBps / 100}%</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
