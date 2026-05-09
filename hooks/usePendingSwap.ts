'use client';

import { useEffect } from 'react';
import type { PendingSwap, SwapState, SwapEvent, SourceToken } from '@/app/_components/types';
import { PENDING_SWAP_KEY } from '@/app/_components/types';

export function usePendingSwapRestore(
  dispatch: React.Dispatch<SwapEvent>,
  state: SwapState,
) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_SWAP_KEY);
      if (!raw) return;
      const pending: PendingSwap = JSON.parse(raw);
      const age = Date.now() - pending.createdAt;
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PENDING_SWAP_KEY);
        return;
      }
      const token: SourceToken = {
        id: `${pending.chain}:${pending.token}`,
        chain: pending.chain,
        chainLabel: pending.chainLabel,
        token: pending.token,
        decimals: pending.decimals,
        assetId: pending.assetId,
        contractAddress: pending.contractAddress,
      };
      dispatch({
        type: 'restore',
        depositAddress: pending.depositAddress,
        estimatedZec: pending.estimatedZec,
        amount: pending.amount,
        zecAddress: pending.zecAddress,
        token,
        txHash: pending.txHash,
        mode: 'manual',
      });
    } catch {
      localStorage.removeItem(PENDING_SWAP_KEY);
    }
  }, []);
}

export function usePendingSwapPersist(state: SwapState) {
  useEffect(() => {
    if (state.kind === 'waiting') {
      const pending: PendingSwap = {
        depositAddress: state.depositAddress,
        amount: state.amount,
        token: state.selectedToken.token,
        chain: state.selectedToken.chain,
        chainLabel: state.selectedToken.chainLabel,
        assetId: state.selectedToken.assetId,
        decimals: state.selectedToken.decimals,
        contractAddress: state.selectedToken.contractAddress,
        zecAddress: state.zecAddress,
        estimatedZec: state.estimatedZec,
        txHash: state.txHash,
        createdAt: Date.now(),
      };
      localStorage.setItem(PENDING_SWAP_KEY, JSON.stringify(pending));
    }
  }, [state.kind, state.kind === 'waiting' ? state.txHash : null]);
}
