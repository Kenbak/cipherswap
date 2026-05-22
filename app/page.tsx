import { Suspense } from 'react';
import SwapClient from './_components/SwapClient';
import { SwapHero } from './_components/SwapHero';
import { sortTokens, apiTokensToSourceTokens } from './_components/types';
import type { SourceToken, PopularPair } from './_components/types';

const CIPHERSCAN_API = 'https://api.mainnet.cipherscan.app';

async function getInitialTokens(): Promise<SourceToken[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const [tokensRes, pairsRes] = await Promise.all([
      fetch(`${baseUrl}/api/swap/tokens`, { next: { revalidate: 60 } }),
      fetch(`${CIPHERSCAN_API}/api/crosschain/popular-pairs`, { next: { revalidate: 300 } }).catch(() => null),
    ]);
    const tokensData = await tokensRes.json();
    const pairsData = pairsRes ? await pairsRes.json().catch(() => null) : null;
    const popularPairs: PopularPair[] = pairsData?.success ? pairsData.pairs : [];

    if (tokensData.success && tokensData.tokens?.length) {
      const mapped = apiTokensToSourceTokens(tokensData.tokens);
      if (mapped.length > 0) return sortTokens(mapped, popularPairs);
    }
  } catch {}
  return [];
}

export default async function SwapPage() {
  const initialTokens = await getInitialTokens();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SwapHero />

      <Suspense fallback={<SwapSkeleton />}>
        <SwapClient initialTokens={initialTokens.length > 0 ? initialTokens : undefined} />
      </Suspense>
    </div>
  );
}

function SwapSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-glass-4">
            <div className="h-3 w-16 bg-glass-6 rounded animate-pulse" />
          </div>
          <div className="p-5 space-y-5">
            <div className="h-4 w-32 bg-glass-6 rounded animate-pulse" />
            <div className="h-12 bg-glass-4 rounded-lg animate-pulse" />
            <div className="h-12 bg-glass-4 rounded-lg animate-pulse" />
            <div className="h-12 bg-glass-4 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="h-24 bg-glass-4 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
