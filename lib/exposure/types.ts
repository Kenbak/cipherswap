export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  deduction: number;
}

export interface HeuristicResult {
  id: string;
  triggered: boolean;
  deduction: number;
  finding: Finding | null;
}

export interface TimezoneInference {
  offset: number;
  confidence: number;
  peakHours: [number, number];
  sleepWindow: [number, number];
}

export interface Transfer {
  signature: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  mint?: string;
  direction: 'in' | 'out';
  type?: string;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  usdValue?: number | null;
}

export interface NftAsset {
  mint: string;
  name?: string;
  collection?: string;
  image?: string;
}

export interface IdentityInfo {
  name?: string;
  domain?: string;
  entityType?: string;
  labels?: string[];
}

export interface FundingSource {
  address: string;
  label?: string;
  entityType?: string;
  amount?: number;
  timestamp?: number;
}

export interface CounterpartyLabel {
  address: string;
  label?: string;
  entityType?: string;
}

export type ExposureChain = 'solana' | 'bitcoin' | 'ethereum';

export const EXPOSURE_CHAINS: ExposureChain[] = ['solana', 'bitcoin', 'ethereum'];

export function parseExposureChain(value: unknown): ExposureChain {
  return EXPOSURE_CHAINS.includes(value as ExposureChain) ? (value as ExposureChain) : 'solana';
}

/** Ethereum-only signals for the account-model heuristics. */
export interface EthereumFacts {
  ens: string | null;
  isContract: boolean;
  outTxs: number;
  approvals: number;
  mixerTxs: number;
  mixers: string[];
  /** Exchange deposit addresses this wallet paid (unique per exchange account). */
  depositAddresses: { address: string; exchange: string }[];
  spamTokens: number;
  tokenCount: number;
  tokenCountCapped: boolean;
  nftCount: number;
  contractsUsed: number;
  /** Data sources that failed to load; the report is incomplete without them. */
  missing: string[];
}

export type BtcAddressType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'unknown';

/** Bitcoin-only signals used by the UTXO heuristics. */
export interface BitcoinFacts {
  addressType: BtcAddressType;
  /** Outputs ever paid to this address; >1 means the address was reused. */
  receiveCount: number;
  spendCount: number;
  balanceSats: number;
  /** Other addresses spent alongside this one (common-input-ownership). */
  coInputAddresses: string[];
  coInputCount: number;
  consolidations: number;
  batchFundings: number;
  roundPayments: number;
  outTxs: number;
  changeTypeMatches: number;
  mixedInputTypes: number;
  dustReceived: number;
  analyzedTxs: number;
}

export interface WalletScanData {
  chain: ExposureChain;
  nativeSymbol: string;
  address: string;
  transfers: Transfer[];
  balances: {
    sol: number;
    /** Native balance in whole coins (SOL, BTC or ETH). */
    native?: number;
    tokens: TokenBalance[];
    nfts: NftAsset[];
    totalUsdValue?: number;
  };
  identity: IdentityInfo | null;
  fundedBy: FundingSource | null;
  counterpartyLabels: CounterpartyLabel[];
  totalTransactions: number;
  /** Transactions actually analysed, when the scanner only reads part of the history. */
  analyzedTxs?: number;
  firstActivityTimestamp: number | null;
  programs: string[];
  programFrequency: Record<string, number>;
  /** Display names for contracts/programs the scanner could name itself. */
  programLabels?: Record<string, string>;
  transactionSources: Record<string, number>;
  transactionTypes: Record<string, number>;
  bitcoin?: BitcoinFacts;
  ethereum?: EthereumFacts;
}

export interface ExposureScore {
  score: number;
  grade: string;
  findings: Finding[];
  timezone: TimezoneInference | null;
  counterpartySummary: {
    total: number;
    labeled: number;
    exchanges: number;
  };
}

export interface ScanResponse {
  success: boolean;
  data?: WalletScanData;
  error?: string;
}
