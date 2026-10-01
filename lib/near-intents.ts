/** Subset of the NEAR Intents 1Click v0 API shapes that CipherSwap reads. */

export interface AppFee {
  recipient: string;
  fee: number;
}

export interface Quote {
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted: string;
  amountInUsd: string;
  minAmountIn: string;
  amountOut: string;
  amountOutFormatted: string;
  amountOutUsd: string;
  minAmountOut: string;
  deadline?: string;
  timeWhenInactive?: string;
  timeEstimate: number;
  refundFee?: string;
  withdrawFee?: string;
}

export interface QuoteRequest {
  dry: boolean;
  swapType: string;
  slippageTolerance: number;
  originAsset: string;
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType: string;
  recipient: string;
  recipientType: string;
  deadline: string;
  appFees?: AppFee[];
}

export interface QuoteResponse {
  correlationId: string;
  timestamp: string;
  signature: string;
  quoteRequest: QuoteRequest;
  quote: Quote;
}

export interface TxRef {
  hash: string;
  explorerUrl: string;
}

export interface SwapDetails {
  intentHashes: string[];
  nearTxHashes: string[];
  amountIn?: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  amountOut?: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  slippage?: number;
  originChainTxHashes: TxRef[];
  destinationChainTxHashes: TxRef[];
  refundedAmount?: string;
  refundedAmountFormatted?: string;
  refundedAmountUsd?: string;
  refundReason?: string;
  depositedAmount?: string;
  depositedAmountFormatted?: string;
  depositedAmountUsd?: string;
}

export type SwapStatus =
  | 'PENDING_DEPOSIT'
  | 'KNOWN_DEPOSIT_TX'
  | 'INCOMPLETE_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

export interface StatusResponse {
  correlationId: string;
  quoteResponse?: QuoteResponse;
  status: SwapStatus;
  updatedAt: string;
  swapDetails?: SwapDetails;
}

export const TERMINAL_STATUSES: ReadonlySet<SwapStatus> = new Set(['SUCCESS', 'REFUNDED', 'FAILED']);

export interface StatusMeta {
  /** Short machine-style label for the log and status line. */
  code: string;
  /** Plain-language headline for the tracker. */
  title: string;
  /** Index into the 4-step progress rail: 0 deposit, 1 detected, 2 swapping, 3 delivered. */
  step: number;
  tone: 'pending' | 'active' | 'success' | 'warning' | 'error';
}

export const STATUS_META: Record<SwapStatus, StatusMeta> = {
  PENDING_DEPOSIT: { code: 'awaiting_deposit', title: 'Waiting for your deposit', step: 0, tone: 'pending' },
  KNOWN_DEPOSIT_TX: { code: 'deposit_detected', title: 'Deposit detected, confirming on chain', step: 1, tone: 'active' },
  INCOMPLETE_DEPOSIT: { code: 'incomplete_deposit', title: 'Deposit is less than the quoted amount', step: 1, tone: 'warning' },
  PROCESSING: { code: 'swapping', title: 'Solvers are swapping to ZEC', step: 2, tone: 'active' },
  SUCCESS: { code: 'delivered', title: 'ZEC delivered', step: 3, tone: 'success' },
  REFUNDED: { code: 'refunded', title: 'Refunded to your address', step: 3, tone: 'warning' },
  FAILED: { code: 'failed', title: 'Swap failed', step: 3, tone: 'error' },
};

export function isSwapStatus(value: unknown): value is SwapStatus {
  return typeof value === 'string' && value in STATUS_META;
}

/** Deposit addresses/memos are base58, hex, bech32 or NEAR account IDs. */
export const DEPOSIT_ADDRESS_RE = /^[A-Za-z0-9._:-]{16,128}$/;
export const DEPOSIT_MEMO_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `~${h}h ${rem}m` : `~${h}h`;
}
