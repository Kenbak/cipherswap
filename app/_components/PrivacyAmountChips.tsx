'use client';

import { useState } from 'react';
import type { SourceToken, CommonAmountsResponse } from './types';
import { formatRecAmount, getBlendingLabel } from './types';

const BLEND_LABEL = { high: 'High', medium: 'Med', low: 'Low' } as const;

function PrivacyAmountsHint() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-sans text-muted hover:text-secondary underline underline-offset-2"
        aria-expanded={open}
      >
        Why?
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <span
            role="tooltip"
            className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-lg border border-[var(--color-border-subtle)] surface-solid px-3 py-2 text-xs font-sans text-secondary leading-relaxed shadow-lg"
          >
            High and Med amounts match recent shielded swap patterns, helping your transaction blend in.
          </span>
        </>
      )}
    </span>
  );
}

interface PrivacyAmountChipsProps {
  recommendations: CommonAmountsResponse;
  selectedToken: SourceToken;
  currentAmount?: string;
  onSelect: (amount: string) => void;
  compact?: boolean;
}

export function PrivacyAmountChips({
  recommendations,
  selectedToken,
  currentAmount,
  onSelect,
  compact = false,
}: PrivacyAmountChipsProps) {
  const chips = recommendations.amounts
    .filter((a) => a.sourceAmount && a.sourceAmount > 0)
    .filter(
      (a) =>
        !a.sourceToken ||
        a.sourceToken.toUpperCase() === selectedToken.token.toUpperCase(),
    )
    .slice(0, 4);

  if (chips.length === 0) return null;

  let bestHighIdx = -1;
  chips.forEach((rec, i) => {
    if (
      bestHighIdx === -1 &&
      getBlendingLabel(rec.blendingScore, rec.dualBlendScore) === 'high'
    ) {
      bestHighIdx = i;
    }
  });

  const activeChipIdx = chips.findIndex(
    (rec) => currentAmount && String(rec.sourceAmount) === currentAmount,
  );

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-sans text-secondary">Privacy-friendly amounts</span>
        <PrivacyAmountsHint />
      </div>
      <div className={`flex gap-1.5 ${compact ? 'flex-nowrap overflow-x-auto no-scrollbar pb-0.5' : 'flex-wrap'}`}>
        {chips.map((rec, i) => {
          const label = getBlendingLabel(rec.blendingScore, rec.dualBlendScore);
          const token = rec.sourceToken || selectedToken.token;
          const isBest = i === bestHighIdx;
          const isActive = i === activeChipIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(String(rec.sourceAmount))}
              className={`flex items-center gap-1 shrink-0 px-2 py-1 rounded-md text-[11px] font-mono transition-colors border ${
                isActive
                  ? 'border-cipher-green/50 bg-cipher-green/10 text-cipher-green'
                  : label === 'high'
                    ? 'border-cipher-green/25 text-cipher-green hover:bg-cipher-green/10'
                    : 'border-[var(--color-border-subtle)] text-secondary hover:bg-[var(--color-inset)]'
              }`}
              title={`≈${rec.amountZec} ZEC · ${rec.txCount} shielding txs`}
            >
              <span
                className={`text-[9px] uppercase tracking-wide ${
                  label === 'high' ? 'text-cipher-green/80' : 'text-muted'
                }`}
              >
                {BLEND_LABEL[label]}
              </span>
              {formatRecAmount(rec.sourceAmount!, token)} {token}
              {isBest && !isActive && (
                <span className="text-[9px] uppercase text-cipher-green/70">Best</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
