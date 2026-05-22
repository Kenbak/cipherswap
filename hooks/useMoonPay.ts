'use client';

import { useCallback, useState } from 'react';
import { loadMoonPay } from '@moonpay/moonpay-js';
import type { SourceToken } from '@/app/_components/types';
import {
  getMoonPayCurrencyCode,
  getMoonPayPublishableKey,
  moonPayEnvironment,
} from '@/lib/moonpay';

interface OpenBuyWidgetOptions {
  walletAddress: string;
  selectedToken: SourceToken;
  onCompleted?: () => void;
}

export function useMoonPay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiKey = getMoonPayPublishableKey();

  const openBuyWidget = useCallback(async ({
    walletAddress,
    selectedToken,
    onCompleted,
  }: OpenBuyWidgetOptions) => {
    if (!apiKey) {
      setError('MoonPay is not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const moonPay = await loadMoonPay();
      if (!moonPay) throw new Error('Failed to load MoonPay SDK');

      const moonPaySdk = moonPay({
        flow: 'buy',
        environment: moonPayEnvironment(apiKey),
        variant: 'overlay',
        params: {
          apiKey,
          theme: 'dark',
          colorCode: '#00D4FF',
          baseCurrencyCode: 'usd',
          defaultCurrencyCode: getMoonPayCurrencyCode(selectedToken.chain, selectedToken.token),
          walletAddress,
        },
        handlers: {
          async onTransactionCompleted() {
            onCompleted?.();
          },
        },
      });

      if (!moonPaySdk) throw new Error('Failed to initialize MoonPay widget');

      const urlForSignature = moonPaySdk.generateUrlForSigning();
      const res = await fetch('/api/moonpay/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlForSignature }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.signature) {
        throw new Error(data.error || 'Failed to sign MoonPay URL');
      }

      moonPaySdk.updateSignature(data.signature);
      moonPaySdk.show();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open MoonPay';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return {
    openBuyWidget,
    loading,
    error,
    clearError: () => setError(null),
    isConfigured: !!apiKey,
  };
}
