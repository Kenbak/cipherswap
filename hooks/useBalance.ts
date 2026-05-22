'use client';

import { useState, useEffect } from 'react';
import type { UseWalletReturn } from '@/hooks/useWallet';
import { chainToWalletType } from '@/hooks/useWallet';
import type { SourceToken } from '@/app/_components/types';

const EVM_CHAINS = ['eth', 'base', 'arb', 'pol', 'op', 'avax', 'bsc'];
const NATIVE_TOKENS = ['eth', 'sol', 'btc', 'bnb', 'doge', 'ltc', 'avax', 'matic', 'pol'];

export function useBalance(
  wallet: Pick<UseWalletReturn, 'connected' | 'address' | 'getNativeBalance' | 'getTokenBalance'>,
  selectedToken: SourceToken,
  refreshKey: number = 0,
) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBalance(null);
    if (!wallet.connected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const chainKey = selectedToken.chain;
    const isEvm = EVM_CHAINS.includes(chainKey);
    const isNative = NATIVE_TOKENS.includes(selectedToken.token.toLowerCase()) && !selectedToken.contractAddress;

    const fetchBal = async () => {
      let bal: string | null = null;
      if (isNative) {
        bal = await wallet.getNativeBalance(isEvm ? chainKey : undefined);
      } else if (selectedToken.contractAddress) {
        bal = await wallet.getTokenBalance(selectedToken.contractAddress, selectedToken.decimals, isEvm ? chainKey : undefined);
      } else {
        bal = await wallet.getNativeBalance(isEvm ? chainKey : undefined);
      }
      if (!cancelled) {
        setBalance(bal);
        setLoading(false);
      }
    };
    fetchBal();
    return () => { cancelled = true; };
  }, [wallet.connected, wallet.address, selectedToken, refreshKey]);

  return { balance, loading };
}
