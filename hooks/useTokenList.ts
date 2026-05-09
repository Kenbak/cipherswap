'use client';

import { useState, useEffect } from 'react';
import type { SourceToken, PopularPair } from '@/app/_components/types';
import { CIPHERSCAN_API, FALLBACK_TOKENS, apiTokensToSourceTokens, sortTokens } from '@/app/_components/types';

export function useTokenList(initialTokens?: SourceToken[]) {
  const [tokens, setTokens] = useState<SourceToken[]>(initialTokens ?? FALLBACK_TOKENS);
  const [loading, setLoading] = useState(!initialTokens);

  useEffect(() => {
    if (initialTokens && initialTokens.length > 0) {
      setTokens(initialTokens);
      setLoading(false);
      return;
    }
    const fetchTokens = async () => {
      try {
        const [tokensRes, pairsRes] = await Promise.all([
          fetch('/api/swap/tokens'),
          fetch(`${CIPHERSCAN_API}/api/crosschain/popular-pairs`).catch(() => null),
        ]);
        const tokensData = await tokensRes.json();
        const pairsData = pairsRes ? await pairsRes.json().catch(() => null) : null;
        const popularPairs: PopularPair[] = pairsData?.success ? pairsData.pairs : [];

        if (tokensData.success && tokensData.tokens?.length) {
          const mapped = apiTokensToSourceTokens(tokensData.tokens);
          if (mapped.length > 0) {
            const sorted = sortTokens(mapped, popularPairs);
            setTokens(sorted);
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchTokens();
  }, []);

  return { tokens, loading };
}
