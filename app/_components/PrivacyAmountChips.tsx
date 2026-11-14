'use client';

import { useState } from 'react';
import type { SourceToken, CommonAmountsResponse } from './types';
import { formatRecAmount, getBlendingLabel } from './types';

interface PrivacyAmountChipsProps {
  recommendations: CommonAmountsResponse;
  selectedToken: SourceToken;
  currentAmount?: string;
  onSelect: (amount: string) => void;
}

/** Amounts that match recent shielded activity, so this swap is harder to single out. */
export function PrivacyAmountChips({ recommendations, selectedToken, currentAmount, onSelect }: PrivacyAmountChipsProps) {
  const [why, setWhy] = useState(false);

  const chips = recommendations.amounts
    .filter((a) => a.sourceAmount && a.sourceAmount > 0)
    .filter((a) => !a.sourceToken || a.sourceToken.toUpperCase() === selectedToken.token.toUpperCase())
    .slice(0, 4);

  if (chips.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-xs text-muted shrink-0">Common amounts</span>
        {chips.map((rec, i) => {
          const label = getBlendingLabel(rec.blendingScore, rec.dualBlendScore);
          const active = currentAmount === String(rec.sourceAmount);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(String(rec.sourceAmount))}
              title={`≈${rec.amountZec} ZEC · ${rec.txCount} similar shielded transactions`}
              className={`shrink-0 px-2 py-0.5 rounded-full text-xs tabular-nums transition-colors ${
                active ? 'bg-cipher-green/15 text-cipher-green' : 'bg-glass-6 text-secondary hover:bg-glass-12'
              }`}
            >
              {label === 'high' && <span className="sr-only">Most common: </span>}
              <span>{formatRecAmount(rec.sourceAmount!, rec.sourceToken || selectedToken.token)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setWhy((v) => !v)}
          aria-expanded={why}
          className="text-xs text-muted hover:text-secondary shrink-0"
          aria-label="Why these amounts"
        >
          ⓘ
        </button>
      </div>
      {why && (
        <p className="mt-1.5 text-xs text-muted leading-relaxed">
          These amounts match recent shielded ZEC activity. Swapping a common amount makes it
          harder to link your deposit to the ZEC that arrives. Data from ZecBlock, last 30 days.
        </p>
      )}
    </div>
  );
}
