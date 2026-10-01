import {
  WalletScanData,
  Finding,
  HeuristicResult,
  ExposureScore,
  Severity,
} from './types';
import { BASE_SCORE, WEIGHTS, THRESHOLDS, BONUSES, scoreToGrade } from './constants';
import { inferTimezone } from './timezone';
import { isKnownExchange } from './known-exchanges';
import { scoreBitcoin } from './bitcoin-scoring';
import { scoreEthereum } from './ethereum-scoring';

function makeFinding(
  id: string,
  severity: Severity,
  title: string,
  description: string,
  deduction: number,
): Finding {
  return { id, severity, title, description, deduction };
}

function heuristicSnsRegistered(data: WalletScanData): HeuristicResult {
  const id = 'sns-registered';
  if (data.identity?.name || data.identity?.domain) {
    const name = data.identity.name || data.identity.domain;
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.snsRegistered,
      finding: makeFinding(
        id,
        'critical',
        'Domain/Name registered',
        `This wallet has a public identity: "${name}". Anyone can look up this address and associate it with this name.`,
        WEIGHTS.snsRegistered,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicKnownEntity(data: WalletScanData): HeuristicResult {
  const id = 'known-entity';
  if (data.identity?.entityType && data.identity.entityType !== 'unknown') {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.knownEntity,
      finding: makeFinding(
        id,
        'critical',
        'Known entity label',
        `This wallet is labeled as "${data.identity.entityType}". It has been identified and categorized by on-chain analytics providers.`,
        WEIGHTS.knownEntity,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicFundedByCex(data: WalletScanData): HeuristicResult {
  const id = 'funded-by-cex';
  if (data.fundedBy?.entityType === 'cex' || data.fundedBy?.label) {
    const source = data.fundedBy.label || 'a known exchange';
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.fundedByCex,
      finding: makeFinding(
        id,
        'critical',
        'Funded by centralized exchange',
        `First SOL came from ${source}. This creates a direct KYC link between your identity and this wallet.`,
        WEIGHTS.fundedByCex,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicFrequentCex(data: WalletScanData): HeuristicResult {
  const id = 'frequent-cex';
  const exchangeInteractions = data.counterpartyLabels.filter(
    c => c.entityType === 'cex' || isKnownExchange(c.address),
  ).length;

  const transfersToExchanges = data.transfers.filter(t => {
    const addr = t.direction === 'out' ? t.to : t.from;
    return isKnownExchange(addr) || data.counterpartyLabels.some(
      c => c.address === addr && c.entityType === 'cex',
    );
  }).length;

  if (exchangeInteractions >= THRESHOLDS.frequentCexInteractions || transfersToExchanges >= THRESHOLDS.frequentCexInteractions) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.frequentCex,
      finding: makeFinding(
        id,
        'high',
        'Frequent exchange interactions',
        `${Math.max(exchangeInteractions, transfersToExchanges)} interactions with centralized exchanges detected. Each creates a potential identity correlation point.`,
        WEIGHTS.frequentCex,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicTimezone(data: WalletScanData): HeuristicResult {
  const id = 'timezone-inference';
  const timestamps = data.transfers.map(t => t.timestamp).filter(Boolean);
  const tz = inferTimezone(timestamps);

  if (tz && tz.confidence >= 0.5) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.timezoneInference,
      finding: makeFinding(
        id,
        'high',
        'Timezone inferred from activity',
        `Transaction timing reveals a consistent sleep pattern suggesting UTC${tz.offset >= 0 ? '+' : ''}${tz.offset} (confidence: ${Math.round(tz.confidence * 100)}%). An adversary can narrow your location to a few timezones.`,
        WEIGHTS.timezoneInference,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicWeekdayPattern(data: WalletScanData): HeuristicResult {
  const id = 'weekday-pattern';
  if (data.transfers.length < 30) {
    return { id, triggered: false, deduction: 0, finding: null };
  }

  let weekday = 0;
  let weekend = 0;
  for (const t of data.transfers) {
    const day = new Date(t.timestamp * 1000).getUTCDay();
    if (day === 0 || day === 6) weekend++;
    else weekday++;
  }

  const weekdayRatio = weekday / (weekday + weekend);
  // Expected ratio is ~71% (5/7). A strong bias is >85%
  if (weekdayRatio > 0.85) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.weekdayPattern,
      finding: makeFinding(
        id,
        'medium',
        'Strong weekday activity pattern',
        `${Math.round(weekdayRatio * 100)}% of transactions occur on weekdays, suggesting a regular work schedule that narrows your behavioral profile.`,
        WEIGHTS.weekdayPattern,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicTransactionVolume(data: WalletScanData): HeuristicResult {
  const id = 'transaction-volume';
  if (data.totalTransactions >= THRESHOLDS.highTransactionVolume) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.transactionVolume,
      finding: makeFinding(
        id,
        'medium',
        'High transaction volume',
        `${data.totalTransactions} transactions create a deep behavioral profile. More data points make pattern analysis more accurate.`,
        WEIGHTS.transactionVolume,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicUniqueCounterparties(data: WalletScanData): HeuristicResult {
  const id = 'unique-counterparties';
  const unique = new Set<string>();
  for (const t of data.transfers) {
    if (t.direction === 'out' && t.to) unique.add(t.to);
    if (t.direction === 'in' && t.from) unique.add(t.from);
  }

  if (unique.size >= THRESHOLDS.highCounterparties) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.uniqueCounterparties,
      finding: makeFinding(
        id,
        'medium',
        'Large counterparty network',
        `${unique.size} unique addresses interacted with. This exposes a social/economic graph that can be analyzed for clustering.`,
        WEIGHTS.uniqueCounterparties,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicDappDiversity(data: WalletScanData): HeuristicResult {
  const id = 'dapp-diversity';
  if (data.programs.length >= THRESHOLDS.highDappDiversity) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.dappDiversity,
      finding: makeFinding(
        id,
        'medium',
        'Diverse DApp usage',
        `Interacted with ${data.programs.length} distinct programs. Each protocol interaction adds behavioral fingerprint data.`,
        WEIGHTS.dappDiversity,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicAccountAge(data: WalletScanData): HeuristicResult {
  const id = 'account-age';
  if (!data.firstActivityTimestamp) {
    return { id, triggered: false, deduction: 0, finding: null };
  }

  const ageMs = Date.now() - data.firstActivityTimestamp * 1000;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays >= THRESHOLDS.longAccountAge) {
    const years = Math.floor(ageDays / 365);
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.accountAge,
      finding: makeFinding(
        id,
        'medium',
        'Long account history',
        `Active for ${years}+ year${years > 1 ? 's' : ''}. Extended history provides more data for behavioral analysis and pattern matching.`,
        WEIGHTS.accountAge,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicNftHoldings(data: WalletScanData): HeuristicResult {
  const id = 'nft-holdings';
  const nftCount = data.balances.nfts.length;

  if (nftCount >= THRESHOLDS.highNftCount) {
    const names = data.balances.nfts
      .slice(0, 3)
      .map(n => n.name || n.collection || 'Unknown')
      .join(', ');
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.nftHoldings,
      finding: makeFinding(
        id,
        'high',
        'NFT holdings reveal identity',
        `Holding ${nftCount} NFTs (${names}${nftCount > 3 ? '...' : ''}). PFPs, POAPs, and collection memberships can reveal social identity and event attendance.`,
        WEIGHTS.nftHoldings,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicTokenDiversity(data: WalletScanData): HeuristicResult {
  const id = 'token-diversity';
  const tokenCount = data.balances.tokens.length;

  if (tokenCount >= THRESHOLDS.highTokenDiversity) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.tokenDiversity,
      finding: makeFinding(
        id,
        'low',
        'Diverse token portfolio',
        `Holding ${tokenCount} different tokens. Your full portfolio composition is publicly visible and can be used for profiling.`,
        WEIGHTS.tokenDiversity,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicDustTransactions(data: WalletScanData): HeuristicResult {
  const id = 'dust-transactions';
  const dustTxs = data.transfers.filter(
    t => t.direction === 'in' && t.amount > 0 && t.amount < THRESHOLDS.dustAmountSol,
  );

  if (dustTxs.length >= 3) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.dustTransactions,
      finding: makeFinding(
        id,
        'medium',
        'Dust transactions received',
        `${dustTxs.length} tiny unsolicited transfers detected. These are often used to track wallet activity and link addresses.`,
        WEIGHTS.dustTransactions,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicTokenApprovals(data: WalletScanData): HeuristicResult {
  const id = 'token-approvals';
  const approvalPrograms = data.programs.filter(p =>
    p.includes('Token') || p.includes('stake') || p.includes('delegate'),
  );

  if (approvalPrograms.length >= 3) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.tokenApprovals,
      finding: makeFinding(
        id,
        'low',
        'Active token delegations',
        `Interacted with ${approvalPrograms.length} token/delegation programs. Active approvals maintain an ongoing exposure surface.`,
        WEIGHTS.tokenApprovals,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

function heuristicMultiSourceFunding(data: WalletScanData): HeuristicResult {
  const id = 'multi-source-funding';
  const inboundSources = new Set<string>();
  for (const t of data.transfers) {
    if (t.direction === 'in' && t.from && t.amount >= 0.01) {
      inboundSources.add(t.from);
    }
  }

  if (inboundSources.size >= THRESHOLDS.multiSourceCount) {
    return {
      id,
      triggered: true,
      deduction: WEIGHTS.multiSourceFunding,
      finding: makeFinding(
        id,
        'high',
        'Multiple funding sources',
        `Received funds from ${inboundSources.size} distinct addresses. This suggests linked wallets that can be clustered together.`,
        WEIGHTS.multiSourceFunding,
      ),
    };
  }
  return { id, triggered: false, deduction: 0, finding: null };
}

export function scoreWallet(data: WalletScanData): ExposureScore {
  if (data.chain === 'bitcoin') return scoreBitcoin(data);
  if (data.chain === 'ethereum') return scoreEthereum(data);
  const heuristics: HeuristicResult[] = [
    heuristicSnsRegistered(data),
    heuristicKnownEntity(data),
    heuristicFundedByCex(data),
    heuristicFrequentCex(data),
    heuristicTimezone(data),
    heuristicWeekdayPattern(data),
    heuristicTransactionVolume(data),
    heuristicUniqueCounterparties(data),
    heuristicDappDiversity(data),
    heuristicAccountAge(data),
    heuristicNftHoldings(data),
    heuristicTokenDiversity(data),
    heuristicDustTransactions(data),
    heuristicTokenApprovals(data),
    heuristicMultiSourceFunding(data),
  ];

  let totalDeduction = 0;
  const findings: Finding[] = [];

  for (const h of heuristics) {
    if (h.triggered && h.finding) {
      totalDeduction += h.deduction;
      findings.push(h.finding);
    }
  }

  let score = BASE_SCORE - totalDeduction;

  // Bonuses
  if (data.totalTransactions <= BONUSES.freshWalletMaxTxs) {
    score += BONUSES.freshWallet;
  }

  const hasExchangeLink = heuristics.some(
    h => h.id === 'funded-by-cex' && h.triggered,
  ) || heuristics.some(
    h => h.id === 'frequent-cex' && h.triggered,
  );
  if (!hasExchangeLink) {
    score += BONUSES.noExchangeLinks;
  }

  score = Math.max(0, Math.min(100, score));

  const timestamps = data.transfers.map(t => t.timestamp).filter(Boolean);
  const timezone = inferTimezone(timestamps);

  const exchangeCounterparties = data.counterpartyLabels.filter(
    c => c.entityType === 'cex' || isKnownExchange(c.address),
  );

  return {
    score,
    grade: scoreToGrade(score),
    findings: findings.sort((a, b) => b.deduction - a.deduction),
    timezone,
    counterpartySummary: {
      total: data.counterpartyLabels.length,
      labeled: data.counterpartyLabels.filter(c => c.label).length,
      exchanges: exchangeCounterparties.length,
    },
  };
}
