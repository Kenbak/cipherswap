'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SourceToken } from '@/app/_components/types';
import { ZEC_ASSET_ID } from '@/app/_components/types';
import { toSmallestUnit } from '@/lib/amount';
import { humanizeQuoteError } from '@/lib/errors';
import type { QuoteResponse } from '@/lib/near-intents';

interface Result {
  /** Inputs this result was fetched for; results for other inputs are never shown. */
  key: string | null;
  data: QuoteResponse | null;
  error: string | null;
  fetchedAt: number | null;
  refreshing: boolean;
}

/**
 * Indicative (dry) quote for the current inputs. No user addresses are sent.
 * Results are keyed to their inputs, so a stale estimate can never be shown
 * next to a new amount. `refreshMs` keeps the numbers live.
 */
export function useQuotePreview(opts: {
  token: SourceToken;
  amount: string;
  slippageBps: number;
  refreshMs: number;
  enabled?: boolean;
}) {
  const { token, amount, slippageBps, refreshMs, enabled = true } = opts;
  const [result, setResult] = useState<Result>({ key: null, data: null, error: null, fetchedAt: null, refreshing: false });
  const [tick, setTick] = useState(0);
  const lastKey = useRef<string | null>(null);

  const smallest = toSmallestUnit(amount, token.decimals);
  const key = enabled && smallest ? `${token.assetId}|${smallest}|${slippageBps}` : null;

  useEffect(() => {
    if (!key || !smallest) return;
    const isRefresh = lastKey.current === key;
    lastKey.current = key;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (isRefresh) setResult((r) => (r.key === key ? { ...r, refreshing: true } : r));
      try {
        const res = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            originAsset: token.assetId,
            destinationAsset: ZEC_ASSET_ID,
            amount: smallest.toString(),
            slippageBps,
            dry: true,
          }),
        });
        const json = await res.json();
        if (controller.signal.aborted) return;
        if (!json.success || !json.quote) {
          const error = humanizeQuoteError(json.error || 'No quote available', { symbol: token.token, decimals: token.decimals });
          setResult({ key, data: null, error, fetchedAt: Date.now(), refreshing: false });
          return;
        }
        setResult({ key, data: json as QuoteResponse, error: null, fetchedAt: Date.now(), refreshing: false });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('[quote-preview] request failed:', err);
        setResult({ key, data: null, error: 'Could not reach the quote service. Retrying…', fetchedAt: Date.now(), refreshing: false });
      }
    }, isRefresh ? 0 : 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `smallest`, `token` and `slippageBps` are all encoded in `key`; `tick` re-runs it for refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const current = key !== null && result.key === key;
  const fetchedAt = current ? result.fetchedAt : null;
  const hasError = current && !!result.error;

  useEffect(() => {
    if (!fetchedAt) return;
    const t = setTimeout(() => setTick((n) => n + 1), hasError ? Math.min(refreshMs, 8000) : refreshMs);
    return () => clearTimeout(t);
  }, [fetchedAt, hasError, refreshMs]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    fetchedAt,
    loading: key !== null && (!current || result.refreshing),
    refresh,
  };
}
