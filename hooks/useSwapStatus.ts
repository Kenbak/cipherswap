'use client';

import { useEffect, useRef, useState } from 'react';
import type { StatusResponse } from '@/lib/near-intents';
import { TERMINAL_STATUSES, isSwapStatus } from '@/lib/near-intents';

const BASE_INTERVAL_MS = 6000;
const MAX_BACKOFF_MS = 30000;
/** New deposit addresses can take a moment to appear in the status index. */
const NOT_FOUND_GRACE_MS = 2 * 60 * 1000;

export interface SwapStatusState {
  data: StatusResponse | null;
  /** Set while the last poll failed; polling keeps retrying. */
  connectionError: string | null;
  notFound: boolean;
  nextRetryAt: number | null;
  lastCheckedAt: number | null;
}

/** `createdAt` null defers polling until the local record is loaded; 0 means created elsewhere. */
export function useSwapStatus(depositAddress: string, depositMemo: string | undefined, createdAt: number | null) {
  const [state, setState] = useState<SwapStatusState>({
    data: null, connectionError: null, notFound: false, nextRetryAt: null, lastCheckedAt: null,
  });
  const failures = useRef(0);

  useEffect(() => {
    if (createdAt === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const qs = new URLSearchParams({ depositAddress });
    if (depositMemo) qs.set('depositMemo', depositMemo);

    const schedule = (ms: number) => {
      if (cancelled) return;
      setState((s) => ({ ...s, nextRetryAt: Date.now() + ms }));
      timer = setTimeout(poll, ms);
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/swap/status?${qs}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (res.status === 404) {
          const young = createdAt > 0 && Date.now() - createdAt < NOT_FOUND_GRACE_MS;
          failures.current = 0;
          setState((s) => ({ ...s, notFound: !young, connectionError: null, lastCheckedAt: Date.now() }));
          if (young) schedule(BASE_INTERVAL_MS);
          return;
        }
        if (!res.ok || !json?.success || !isSwapStatus(json.status)) {
          throw new Error(json?.error || `Status service returned ${res.status}`);
        }

        failures.current = 0;
        const data = json as StatusResponse;
        setState({ data, connectionError: null, notFound: false, nextRetryAt: null, lastCheckedAt: Date.now() });
        if (!TERMINAL_STATUSES.has(data.status)) schedule(BASE_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        failures.current += 1;
        const backoff = Math.min(MAX_BACKOFF_MS, BASE_INTERVAL_MS * 2 ** (failures.current - 1));
        const message = err instanceof Error ? err.message : 'Status check failed';
        console.error('[swap-status] poll failed:', message);
        setState((s) => ({ ...s, connectionError: message, lastCheckedAt: Date.now() }));
        schedule(backoff);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [depositAddress, depositMemo, createdAt]);

  return state;
}
