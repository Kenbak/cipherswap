export const BASE_SCORE = 70;

export const WEIGHTS = {
  snsRegistered: 25,
  knownEntity: 15,
  fundedByCex: 15,
  frequentCex: 10,
  timezoneInference: 10,
  weekdayPattern: 5,
  transactionVolume: 5,
  uniqueCounterparties: 5,
  dappDiversity: 5,
  accountAge: 5,
  nftHoldings: 10,
  tokenDiversity: 5,
  dustTransactions: 5,
  tokenApprovals: 5,
  multiSourceFunding: 10,
} as const;

export const THRESHOLDS = {
  highTransactionVolume: 500,
  highCounterparties: 50,
  highDappDiversity: 10,
  longAccountAge: 365,
  highNftCount: 3,
  highTokenDiversity: 20,
  dustAmountSol: 0.001,
  minTxsForTimezone: 30,
  frequentCexInteractions: 5,
  multiSourceCount: 3,
} as const;

export const BONUSES = {
  freshWallet: 10,
  noExchangeLinks: 5,
  freshWalletMaxTxs: 10,
} as const;

export const GRADE_BOUNDARIES = [
  { min: 95, grade: 'A+' },
  { min: 85, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 25, grade: 'D' },
  { min: 0, grade: 'F' },
] as const;

export function scoreToGrade(score: number): string {
  for (const { min, grade } of GRADE_BOUNDARIES) {
    if (score >= min) return grade;
  }
  return 'F';
}

/** ZecBlock semantic palette: green safe → gold → orange → danger. */
export const GRADE_COLORS: Record<string, string> = {
  'A+': '#65C79A',
  'A': '#65C79A',
  'B': '#B6A0E0',
  'C': '#F8BC21',
  'D': '#E2A66E',
  'F': '#D58D86',
};
