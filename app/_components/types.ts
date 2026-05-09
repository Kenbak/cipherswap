import type { DetectedWallet } from '@/hooks/useWallet';

export interface SourceToken {
  id: string;
  chain: string;
  chainLabel: string;
  token: string;
  decimals: number;
  assetId: string;
  contractAddress?: string;
}

export interface CommonAmount {
  amountZec: number;
  txCount: number;
  percentage: string;
  blendingScore: number;
  chainSwapCount?: number;
  sourceAmount?: number | null;
  sourceToken?: string | null;
  dualBlendScore?: number;
}

export interface CommonAmountsResponse {
  success: boolean;
  period: string;
  chain: string | null;
  totalTransactions: number;
  amounts: CommonAmount[];
  tip: string;
}

export interface QuoteResponse {
  success: boolean;
  depositAddress?: string;
  amountOut?: string;
  estimatedAmountOut?: string;
  deadline?: string;
  error?: string;
  quote?: any;
}

export interface PendingSwap {
  depositAddress: string;
  amount: string;
  token: string;
  chain: string;
  chainLabel: string;
  assetId: string;
  decimals: number;
  contractAddress?: string;
  zecAddress: string;
  estimatedZec: string;
  txHash?: string;
  createdAt: number;
}

export interface PopularPair {
  chain: string;
  token: string;
  swapCount: number;
}

export type Mode = 'wallet' | 'manual';

export interface FormFields {
  amount: string;
  zecAddress: string;
  refundAddress: string;
  slippageBps: number;
  selectedToken: SourceToken;
}

export type SwapState =
  | { kind: 'connect' }
  | { kind: 'form'; mode: Mode } & FormFields
  | { kind: 'quoting'; mode: Mode } & FormFields
  | { kind: 'quote'; mode: Mode; depositAddress: string; estimatedZec: string; expiresAt: number } & FormFields
  | { kind: 'waiting'; mode: Mode; depositAddress: string; estimatedZec: string; txHash?: string } & FormFields
  | { kind: 'complete'; mode: Mode; estimatedZec: string } & FormFields
  | { kind: 'error'; mode: Mode; reason: string; retryFields?: FormFields };

export type SwapEvent =
  | { type: 'choose_wallet' }
  | { type: 'choose_manual' }
  | { type: 'disconnect' }
  | { type: 'select_token'; token: SourceToken }
  | { type: 'set_amount'; amount: string }
  | { type: 'set_zec_addr'; address: string }
  | { type: 'set_refund_addr'; address: string }
  | { type: 'set_slippage'; bps: number }
  | { type: 'request_quote' }
  | { type: 'quote_received'; depositAddress: string; estimatedZec: string }
  | { type: 'quote_expired' }
  | { type: 'confirm' }
  | { type: 'tx_sent'; hash: string }
  | { type: 'status_complete' }
  | { type: 'status_failed'; reason: string }
  | { type: 'retry' }
  | { type: 'reset' }
  | { type: 'restore'; depositAddress: string; estimatedZec: string; amount: string; zecAddress: string; token: SourceToken; txHash?: string; mode: Mode };

export const CIPHERSCAN_API = 'https://api.mainnet.cipherscan.app';
export const ZEC_ASSET_ID = 'nep141:zec.omft.near';
export const ZEC_DECIMALS = 8;
export const PENDING_SWAP_KEY = 'cipherswap_pending_swap';

export const CHAIN_EXPLORERS: Record<string, string> = {
  eth: 'https://etherscan.io/tx/',
  base: 'https://basescan.org/tx/',
  arb: 'https://arbiscan.io/tx/',
  op: 'https://optimistic.etherscan.io/tx/',
  pol: 'https://polygonscan.com/tx/',
  avax: 'https://snowtrace.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  sol: 'https://solscan.io/tx/',
  btc: 'https://mempool.space/tx/',
  near: 'https://nearblocks.io/txns/',
  gnosis: 'https://gnosisscan.io/tx/',
  bera: 'https://berascan.com/tx/',
  scroll: 'https://scrollscan.com/tx/',
  tron: 'https://tronscan.org/#/transaction/',
};

export const CHAIN_LABELS: Record<string, string> = {
  eth: 'Ethereum', base: 'Base', arb: 'Arbitrum', sol: 'Solana', btc: 'Bitcoin',
  near: 'NEAR', ton: 'TON', doge: 'Dogecoin', xrp: 'XRP', bsc: 'BNB Chain',
  pol: 'Polygon', tron: 'Tron', sui: 'Sui', op: 'Optimism', avax: 'Avalanche',
  ltc: 'Litecoin', bch: 'Bitcoin Cash', gnosis: 'Gnosis', bera: 'Berachain',
  cardano: 'Cardano', starknet: 'Starknet', zec: 'Zcash', aleo: 'Aleo',
  xlayer: 'XLayer', monad: 'Monad', adi: 'ADI', plasma: 'Plasma', scroll: 'Scroll',
  dash: 'Dash',
};

export const FALLBACK_TOKENS: SourceToken[] = [
  { id: 'eth-usdc', chain: 'eth', chainLabel: 'Ethereum', token: 'USDC', decimals: 6, assetId: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near' },
  { id: 'eth-eth', chain: 'eth', chainLabel: 'Ethereum', token: 'ETH', decimals: 18, assetId: 'nep141:eth.omft.near' },
  { id: 'btc-btc', chain: 'btc', chainLabel: 'Bitcoin', token: 'BTC', decimals: 8, assetId: 'nep141:btc.omft.near' },
  { id: 'sol-sol', chain: 'sol', chainLabel: 'Solana', token: 'SOL', decimals: 9, assetId: 'nep141:sol.omft.near' },
  { id: 'near-near', chain: 'near', chainLabel: 'NEAR', token: 'NEAR', decimals: 24, assetId: 'nep141:wrap.near' },
];

export const BASE58_CHARS = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

export function validateZecAddress(addr: string): string | null {
  if (!addr) return null;
  if (addr.startsWith('u1') || addr.startsWith('utest')) {
    if (addr.length < 80) return 'Unified address too short';
    return null;
  }
  if (addr.startsWith('zs') || addr.startsWith('ztestsapling')) {
    if (addr.length < 70) return 'Sapling address too short';
    return null;
  }
  if (!addr.startsWith('t1') && !addr.startsWith('t3'))
    return 'Must start with t1, t3, u1, or zs';
  if (!BASE58_CHARS.test(addr))
    return 'Contains invalid characters';
  if (addr.length !== 35)
    return `Transparent address must be 35 characters (currently ${addr.length})`;
  return null;
}

export function formatRecAmount(amount: number, token: string): string {
  const t = token.toLowerCase();
  if (['usdc', 'usdt', 'dai', 'busd', 'tusd', 'usdp'].includes(t)) {
    return amount >= 1 ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : amount.toString();
  }
  if (amount === 0) return '0';
  if (amount >= 100) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  if (amount >= 0.01) return amount.toFixed(3);
  return amount.toFixed(4);
}

export function getBlendingLabel(score: number, dualScore?: number): 'high' | 'medium' | 'low' {
  const effective = dualScore || score;
  if (effective >= 30) return 'high';
  if (effective >= 10) return 'medium';
  return 'low';
}

export function getChainEtaLabel(chain: string): string {
  if (['sol'].includes(chain)) return '~1-2 min';
  if (['near', 'ton', 'sui'].includes(chain)) return '~2-5 min';
  if (['eth', 'base', 'arb', 'op', 'pol', 'avax', 'bsc', 'gnosis', 'bera', 'scroll'].includes(chain)) return '~5-15 min';
  if (['tron'].includes(chain)) return '~3-10 min';
  if (['btc', 'ltc', 'bch', 'doge', 'dash'].includes(chain)) return '~20-60 min';
  return '~5-30 min';
}

const FALLBACK_TOKEN_ORDER = ['usdc', 'eth', 'usdt', 'btc', 'sol', 'bnb', 'near', 'dai', 'doge', 'xrp', 'ton', 'ltc'];
const FALLBACK_CHAIN_ORDER = ['eth', 'sol', 'base', 'arb', 'btc', 'bsc', 'op', 'pol', 'avax', 'near', 'ton', 'doge', 'xrp', 'ltc', 'sui', 'tron'];

export function sortTokens(tokens: SourceToken[], popularPairs: PopularPair[]): SourceToken[] {
  if (popularPairs.length > 0) {
    const pairRank = new Map<string, number>();
    popularPairs.forEach((p, i) => {
      pairRank.set(`${p.chain.toLowerCase()}:${p.token.toLowerCase()}`, i);
    });
    return [...tokens].sort((a, b) => {
      const aKey = `${a.chain.toLowerCase()}:${a.token.toLowerCase()}`;
      const bKey = `${b.chain.toLowerCase()}:${b.token.toLowerCase()}`;
      const aRank = pairRank.get(aKey) ?? 9999;
      const bRank = pairRank.get(bKey) ?? 9999;
      if (aRank !== bRank) return aRank - bRank;
      const aToken = FALLBACK_TOKEN_ORDER.indexOf(a.token.toLowerCase());
      const bToken = FALLBACK_TOKEN_ORDER.indexOf(b.token.toLowerCase());
      if ((aToken >= 0 ? aToken : 999) !== (bToken >= 0 ? bToken : 999))
        return (aToken >= 0 ? aToken : 999) - (bToken >= 0 ? bToken : 999);
      return a.chainLabel.localeCompare(b.chainLabel);
    });
  }
  return [...tokens].sort((a, b) => {
    const aToken = FALLBACK_TOKEN_ORDER.indexOf(a.token.toLowerCase());
    const bToken = FALLBACK_TOKEN_ORDER.indexOf(b.token.toLowerCase());
    const aRank = aToken >= 0 ? aToken : 999;
    const bRank = bToken >= 0 ? bToken : 999;
    if (aRank !== bRank) return aRank - bRank;
    const aChain = FALLBACK_CHAIN_ORDER.indexOf(a.chain.toLowerCase());
    const bChain = FALLBACK_CHAIN_ORDER.indexOf(b.chain.toLowerCase());
    if ((aChain >= 0 ? aChain : 999) !== (bChain >= 0 ? bChain : 999))
      return (aChain >= 0 ? aChain : 999) - (bChain >= 0 ? bChain : 999);
    return a.chainLabel.localeCompare(b.chainLabel);
  });
}

export function apiTokensToSourceTokens(apiTokens: any[]): SourceToken[] {
  return apiTokens
    .filter(t => {
      if (!t.assetId || !t.symbol || !t.blockchain || t.decimals == null) return false;
      const id = t.assetId.toLowerCase();
      if (id.includes('zec') || t.blockchain === 'zec') return false;
      return true;
    })
    .map(t => {
      let contractAddress: string | undefined;
      if (t.address) contractAddress = t.address;
      else if (t.contractAddress) contractAddress = t.contractAddress;
      else if (t.assetId) {
        const evmMatch = t.assetId.match(/0x[a-fA-F0-9]{40}/);
        if (evmMatch) {
          contractAddress = evmMatch[0];
        } else {
          const solMatch = t.assetId.match(/sol-([A-HJ-NP-Za-km-z1-9]{32,44})\./);
          if (solMatch) contractAddress = solMatch[1];
        }
      }
      return {
        id: `${t.blockchain}-${t.symbol.toLowerCase()}-${t.assetId}`,
        chain: t.blockchain,
        chainLabel: CHAIN_LABELS[t.blockchain] || t.blockchain,
        token: t.symbol,
        decimals: t.decimals,
        assetId: t.assetId,
        contractAddress,
      };
    });
}
