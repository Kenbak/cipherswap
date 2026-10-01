'use client';

import { useEffect, useState } from 'react';
import { localDataSummary, SWAP_HISTORY_EVENT, wipeLocalData } from '@/lib/swap-history';

export function LocalDataControls() {
  const [summary, setSummary] = useState<{ swaps: number; hasLastWallet: boolean } | null>(null);
  const [wiped, setWiped] = useState(false);

  useEffect(() => {
    const load = () => setSummary(localDataSummary());
    load();
    window.addEventListener(SWAP_HISTORY_EVENT, load);
    return () => window.removeEventListener(SWAP_HISTORY_EVENT, load);
  }, []);

  if (!summary) return null;
  const empty = summary.swaps === 0 && !summary.hasLastWallet;

  return (
    <div className="panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <p className="term text-secondary">
        {empty
          ? wiped ? 'local data wiped' : 'nothing stored in this browser'
          : `${summary.swaps} swap${summary.swaps === 1 ? '' : 's'} stored${summary.hasLastWallet ? ' · last wallet name' : ''}`}
      </p>
      {!empty && (
        <button
          type="button"
          onClick={() => { wipeLocalData(); setWiped(true); }}
          className="btn-secondary !py-1.5 !text-xs !text-danger !border-danger/30"
        >
          Wipe local data
        </button>
      )}
    </div>
  );
}
