'use client';

import { useState, useEffect } from 'react';

export function useQuoteCountdown(
  expiresAt: number | null,
  onExpire: () => void,
) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) { setTimeLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const progress = expiresAt ? Math.max(0, (expiresAt - Date.now()) / 60_000) : 0;

  return { timeLeft, progress };
}
