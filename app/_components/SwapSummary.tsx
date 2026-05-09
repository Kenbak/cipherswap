'use client';

import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SourceToken } from './types';

interface SwapSummaryProps {
  amount: string;
  token: SourceToken;
  estimatedZec: string;
  compact?: boolean;
}

export function SwapSummary({ amount, token, estimatedZec, compact }: SwapSummaryProps) {
  const iconSize = compact ? 24 : 28;
  const textSize = compact ? 'text-base' : 'text-lg';

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <TokenChainIcon token={token.token} chain={token.chain} size={iconSize} />
        <div className="min-w-0">
          <div className={`${textSize} font-bold font-mono text-primary truncate`}>
            {amount} <span className="text-secondary font-semibold">{token.token}</span>
          </div>
          <div className="text-[11px] text-muted">{token.chainLabel}</div>
        </div>
      </div>
      <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-right min-w-0">
          <div className={`${textSize} font-bold font-mono text-primary truncate`}>
            {estimatedZec || '~'} <span className="text-secondary font-semibold">ZEC</span>
          </div>
          <div className="text-[11px] text-muted">Estimated</div>
        </div>
        <TokenChainIcon token="zec" chain="zec" size={iconSize} />
      </div>
    </div>
  );
}
