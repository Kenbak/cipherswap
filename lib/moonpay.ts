export function getMoonPayPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY?.trim() || undefined;
}

export function moonPayEnvironment(apiKey: string): 'sandbox' | 'production' {
  return apiKey.startsWith('pk_live_') ? 'production' : 'sandbox';
}

/** Map CipherSwap chain + token to MoonPay defaultCurrencyCode. */
export function getMoonPayCurrencyCode(chain: string, token: string): string {
  const c = chain.toLowerCase();
  const t = token.toLowerCase();

  if (t === 'usdc' || t === 'usdt' || t === 'dai') {
    const stableByChain: Record<string, string> = {
      eth: 'usdc',
      arb: 'usdc_arb',
      base: 'usdc_base',
      pol: 'usdc_polygon',
      op: 'usdc_optimism',
      avax: 'usdc_avalanche',
      bsc: 'usdc_bsc',
    };
    return stableByChain[c] || 'usdc';
  }

  const nativeByChain: Record<string, string> = {
    eth: 'eth',
    base: 'eth_base',
    arb: 'eth_arbitrum',
    op: 'eth_optimism',
    pol: 'matic',
    avax: 'avax',
    bsc: 'bnb',
    sol: 'sol',
    btc: 'btc',
    near: 'near',
  };

  return nativeByChain[c] || 'eth';
}

const MOONPAY_EVM_CHAINS = new Set([
  'eth', 'base', 'arb', 'op', 'pol', 'avax', 'bsc', 'gnosis', 'bera', 'scroll',
]);

export function supportsMoonPayBuy(chain: string, walletType: string | null): boolean {
  if (walletType === 'evm') return MOONPAY_EVM_CHAINS.has(chain.toLowerCase());
  if (walletType === 'solana') return chain.toLowerCase() === 'sol';
  return false;
}
