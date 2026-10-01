import type { ExposureScore, Finding, Severity, WalletScanData } from './types';
import { BASE_SCORE, BONUSES, scoreToGrade } from './constants';
import { inferTimezone } from './timezone';

/**
 * Ethereum exposure heuristics. Account-model chains reuse one address for
 * everything, so the strongest links are names (ENS), exchange deposit
 * addresses (Victor 2020, "Address Clustering Heuristics for Ethereum"),
 * funding sources and the public portfolio.
 */
const ETH_WEIGHTS = {
  ens: 25,
  labeled: 15,
  depositAddress: 15,
  fundedByCex: 15,
  frequentCex: 10,
  mixer: 10,
  timezone: 10,
  multiSource: 10,
  nfts: 10,
  weekday: 5,
  approvals: 5,
  spam: 5,
  counterparties: 5,
  dapps: 5,
  volume: 5,
  tokens: 5,
  longHistory: 5,
  publicBalance: 5,
} as const;

const fmt = (n: number) => n.toLocaleString('en-US');

function finding(id: string, severity: Severity, title: string, description: string, deduction: number): Finding {
  return { id, severity, title, description, deduction };
}

export function scoreEthereum(data: WalletScanData): ExposureScore {
  const e = data.ethereum;
  const findings: Finding[] = [];
  const exchanges = data.counterpartyLabels.filter((c) => c.entityType === 'cex');
  const summary = {
    total: data.counterpartyLabels.length,
    labeled: data.counterpartyLabels.filter((c) => c.label).length,
    exchanges: exchanges.length,
  };
  if (!e) {
    return { score: BASE_SCORE, grade: scoreToGrade(BASE_SCORE), findings, timezone: null, counterpartySummary: summary };
  }

  if (e.ens) {
    findings.push(finding(
      'eth-ens', 'critical', 'Public name attached',
      `This address resolves to "${e.ens}". Anyone who knows the name finds the wallet, and anyone who sees the wallet sees the name.`,
      ETH_WEIGHTS.ens,
    ));
  }

  const nameTag = data.identity?.labels?.[0];
  if (nameTag || data.identity?.entityType) {
    findings.push(finding(
      'known-entity', 'critical', 'Publicly labeled address',
      `Block explorers label this address as "${nameTag ?? data.identity?.name}". Labels spread to every analytics tool that reads them.`,
      ETH_WEIGHTS.labeled,
    ));
  }

  if (e.depositAddresses.length > 0) {
    const names = [...new Set(e.depositAddresses.map((d) => d.exchange))].join(', ');
    findings.push(finding(
      'eth-deposit-address', 'critical', 'Exchange deposit address found',
      `You paid ${e.depositAddresses.length === 1 ? 'an address' : `${e.depositAddresses.length} addresses`} that forward${e.depositAddresses.length === 1 ? 's' : ''} everything to ${names}. Deposit addresses are unique to one exchange account, so this ties the wallet to a KYC'd identity.`,
      ETH_WEIGHTS.depositAddress,
    ));
  }

  if (data.fundedBy?.entityType === 'cex') {
    findings.push(finding(
      'funded-by-cex', 'critical', 'Funded by an exchange',
      `The first ETH came from ${data.fundedBy.label ?? 'a known exchange'}. The exchange knows who withdrew it.`,
      ETH_WEIGHTS.fundedByCex,
    ));
  }

  const cexTransfers = data.transfers.filter((t) => {
    const other = (t.direction === 'out' ? t.to : t.from).toLowerCase();
    return exchanges.some((c) => c.address.toLowerCase() === other);
  }).length;
  if (cexTransfers >= 3) {
    const names = [...new Set(exchanges.map((c) => c.label?.replace(/ deposit$/, '')))].filter(Boolean).slice(0, 3).join(', ');
    findings.push(finding(
      'frequent-cex', 'high', 'Regular exchange flows',
      `${fmt(cexTransfers)} transfers to or from exchanges (${names}). Each one is a point where your identity and this address meet.`,
      ETH_WEIGHTS.frequentCex,
    ));
  }

  if (e.mixerTxs > 0) {
    findings.push(finding(
      'eth-mixer', 'high', 'Mixer interaction is visible',
      `${fmt(e.mixerTxs)} transaction${e.mixerTxs > 1 ? 's' : ''} with ${e.mixers.join(', ')}. Exchanges flag these addresses, and fixed-size deposits are often matched to withdrawals by amount and timing.`,
      ETH_WEIGHTS.mixer,
    ));
  }

  const tz = inferTimezone(data.transfers.map((t) => t.timestamp).filter(Boolean));
  if (tz && tz.confidence >= 0.5) {
    findings.push(finding(
      'timezone-inference', 'high', 'Timezone inferred from activity',
      `Activity stops during a window consistent with sleep at UTC${tz.offset >= 0 ? '+' : ''}${tz.offset} (${Math.round(tz.confidence * 100)}% confidence). That narrows your location to a few countries.`,
      ETH_WEIGHTS.timezone,
    ));
  }

  if (data.transfers.length >= 30) {
    const weekday = data.transfers.filter((t) => { const d = new Date(t.timestamp * 1000).getUTCDay(); return d !== 0 && d !== 6; }).length;
    const ratio = weekday / data.transfers.length;
    if (ratio > 0.85) {
      findings.push(finding(
        'weekday-pattern', 'medium', 'Strong weekday pattern',
        `${Math.round(ratio * 100)}% of activity lands on weekdays, suggesting a work schedule.`,
        ETH_WEIGHTS.weekday,
      ));
    }
  }

  const sources = new Set(
    data.transfers
      .filter((t) => t.direction === 'in' && t.type === 'native' && t.amount >= 0.01)
      .map((t) => t.from.toLowerCase())
      .filter((a) => !exchanges.some((c) => c.address.toLowerCase() === a)),
  );
  if (sources.size >= 3) {
    findings.push(finding(
      'multi-source-funding', 'high', 'Funded from several wallets',
      `ETH arrived from ${fmt(sources.size)} different addresses. If any of them are yours, they are now linked to this one.`,
      ETH_WEIGHTS.multiSource,
    ));
  }

  if (e.nftCount >= 3) {
    const names = [...new Set(data.balances.nfts.map((n) => n.collection || n.name).filter(Boolean))].slice(0, 3).join(', ');
    findings.push(finding(
      'nft-holdings', 'high', 'NFTs reveal who you are',
      `Holding ${e.nftCount >= 50 ? '50+' : fmt(e.nftCount)} NFTs${names ? ` (${names})` : ''}. PFPs, POAPs and name NFTs tie the wallet to social accounts and events.`,
      ETH_WEIGHTS.nfts,
    ));
  }

  if (e.approvals >= 3) {
    findings.push(finding(
      'token-approvals', 'low', 'Token approvals on record',
      `${fmt(e.approvals)} approval transactions. They reveal which apps you trust and stay exploitable until revoked.`,
      ETH_WEIGHTS.approvals,
    ));
  }

  if (e.spamTokens >= 3) {
    findings.push(finding(
      'eth-spam', 'medium', 'Targeted by spam tokens',
      `${fmt(e.spamTokens)} unsolicited or flagged tokens. Spam airdrops track active wallets, and look-alike transfers are used for address poisoning.`,
      ETH_WEIGHTS.spam,
    ));
  }

  if (summary.total >= 50) {
    findings.push(finding(
      'unique-counterparties', 'medium', 'Large counterparty network',
      `Moved value with ${fmt(summary.total)} addresses. That graph exposes who you pay and who pays you.`,
      ETH_WEIGHTS.counterparties,
    ));
  }

  if (e.contractsUsed >= 10) {
    findings.push(finding(
      'dapp-diversity', 'medium', 'Broad app fingerprint',
      `Called ${fmt(e.contractsUsed)} different contracts. The mix of apps you use is distinctive.`,
      ETH_WEIGHTS.dapps,
    ));
  }

  if (data.totalTransactions >= 500) {
    findings.push(finding(
      'transaction-volume', 'medium', 'Deep transaction history',
      `${fmt(data.totalTransactions)} transactions give analysts a large sample to profile.`,
      ETH_WEIGHTS.volume,
    ));
  }

  if (e.tokenCount >= 20) {
    findings.push(finding(
      'token-diversity', 'low', 'Portfolio fully visible',
      `${e.tokenCountCapped ? '50+' : fmt(e.tokenCount)} tokens held. Anyone can see your exact portfolio.`,
      ETH_WEIGHTS.tokens,
    ));
  }

  if (data.firstActivityTimestamp && (Date.now() / 1000 - data.firstActivityTimestamp) / 86400 >= 365) {
    findings.push(finding(
      'account-age', 'low', 'Long public history',
      'Over a year of permanent, public history gives analysts more data to correlate.',
      ETH_WEIGHTS.longHistory,
    ));
  }

  if ((data.balances.native ?? 0) > 0 || data.balances.tokens.length > 0) {
    findings.push(finding(
      'eth-public-balance', 'low', 'Balance is public',
      'Anyone with this address can see every token it holds and what it is worth, in real time.',
      ETH_WEIGHTS.publicBalance,
    ));
  }

  const deduction = findings.reduce((s, f) => s + f.deduction, 0);
  let score = BASE_SCORE - deduction;
  if (data.totalTransactions <= BONUSES.freshWalletMaxTxs) score += BONUSES.freshWallet;
  if (!findings.some((f) => f.id === 'funded-by-cex' || f.id === 'frequent-cex' || f.id === 'eth-deposit-address')) score += BONUSES.noExchangeLinks;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: scoreToGrade(score),
    findings: findings.sort((a, c) => c.deduction - a.deduction),
    timezone: tz,
    counterpartySummary: summary,
  };
}
