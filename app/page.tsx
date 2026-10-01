import { Suspense } from 'react';
import SwapClient from './_components/SwapClient';
import { SwapHero, type NetworkStats } from './_components/SwapHero';
import { sortTokens, apiTokensToSourceTokens, CIPHERSCAN_API } from './_components/types';
import type { SourceToken, PopularPair } from './_components/types';
import { getOneClickTokens } from '@/lib/oneclick-tokens';

const FETCH_TIMEOUT_MS = 6000;

async function getInitialTokens(): Promise<SourceToken[]> {
  try {
    const [tokens, pairsRes] = await Promise.all([
      getOneClickTokens(),
      fetch(`${CIPHERSCAN_API}/api/crosschain/popular-pairs`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).catch(() => null),
    ]);
    const pairsData = pairsRes ? await pairsRes.json().catch(() => null) : null;
    const popularPairs: PopularPair[] = pairsData?.success ? pairsData.pairs : [];
    const mapped = apiTokensToSourceTokens(tokens);
    return mapped.length > 0 ? sortTokens(mapped, popularPairs) : [];
  } catch (err) {
    console.error('Initial token list unavailable, client will retry:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function getNetworkStats(): Promise<NetworkStats | null> {
  try {
    const res = await fetch(`${CIPHERSCAN_API}/api/crosschain/db-stats`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await res.json();
    if (!data?.success) return null;
    return {
      volume24h: Number(data.totalVolume24h) || 0,
      swaps24h: Number(data.totalSwaps24h) || 0,
      swapsAllTime: Number(data.totalSwapsAllTime) || 0,
    };
  } catch (err) {
    console.error('Network stats unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function SwapPage() {
  const [initialTokens, stats] = await Promise.all([getInitialTokens(), getNetworkStats()]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[calc(100dvh-var(--nav-height))] flex items-center py-6 sm:py-8">
      <div className="w-full grid gap-6 lg:gap-12 lg:grid-cols-[1fr_480px] items-start">
        <SwapHero stats={stats} />
        <Suspense fallback={<SwapSkeleton />}>
          <SwapClient initialTokens={initialTokens.length > 0 ? initialTokens : undefined} />
        </Suspense>
      </div>
    </div>
  );
}

function SwapSkeleton() {
  return (
    <div className="w-full max-w-[480px] mx-auto swap-card p-2.5 space-y-1" aria-hidden>
      <div className="h-10" />
      <div className="h-32 panel animate-pulse" />
      <div className="h-44 panel animate-pulse" />
      <div className="h-12 rounded-xl border border-glass-4" />
      <div className="h-12 rounded-md bg-cipher-active" />
    </div>
  );
}
