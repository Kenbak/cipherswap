'use client';

import { useState, useEffect, useRef } from 'react';

type PollStatus = string;

export function useStatusPolling(
  depositAddress: string | null,
  active: boolean,
  onComplete: () => void,
  onFailed: (reason: string) => void,
) {
  const [status, setStatus] = useState<PollStatus>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!active || !depositAddress) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/swap/status?depositAddress=${encodeURIComponent(depositAddress)}`);
        const data = await res.json();
        if (data.status === 'COMPLETE' || data.status === 'SUCCESS') {
          setStatus('complete');
          onComplete();
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'FAILED' || data.status === 'REFUNDED') {
          setStatus(data.status.toLowerCase());
          onFailed(`Swap ${data.status.toLowerCase()}. Funds will be returned to your refund address.`);
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          setStatus(data.status || 'processing');
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, depositAddress]);

  return status;
}
