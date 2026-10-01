import type { ExposureScore, Finding, Severity, WalletScanData } from './types';
import { BASE_SCORE, BONUSES, scoreToGrade } from './constants';
import { inferTimezone } from './timezone';

/**
 * Bitcoin exposure heuristics. These are the standard chain-analysis techniques
 * (see Meiklejohn et al. 2013, "A Fistful of Bitcoins", and the Bitcoin wiki
 * "Privacy" page): address reuse, common-input ownership, change detection,
 * round payments, consolidation, and timing.
 */
const BTC_WEIGHTS = {
  addressReuse: 15,
  heavyReuse: 10,
  commonInput: 15,
  changeDetectable: 10,
  roundPayments: 5,
  consolidation: 10,
  batchFunding: 10,
  knownExchange: 15,
  timezone: 10,
  weekday: 5,
  dust: 5,
  legacyScript: 5,
  longHistory: 5,
  publicBalance: 5,
} as const;

function finding(id: string, severity: Severity, title: string, description: string, deduction: number): Finding {
  return { id, severity, title, description, deduction };
}

export function scoreBitcoin(data: WalletScanData): ExposureScore {
  const b = data.bitcoin;
  const findings: Finding[] = [];
  if (!b) {
    return { score: BASE_SCORE, grade: scoreToGrade(BASE_SCORE), findings, timezone: null, counterpartySummary: { total: 0, labeled: 0, exchanges: 0 } };
  }

  if (b.receiveCount > 1) {
    findings.push(finding(
      'btc-address-reuse', 'high', 'Address reused',
      `This address received ${b.receiveCount.toLocaleString('en-US')} separate payments. Every payer can see every other payment and your full balance. Wallets generate a fresh address per payment to prevent exactly this.`,
      BTC_WEIGHTS.addressReuse,
    ));
    if (b.receiveCount >= 20) {
      findings.push(finding(
        'btc-heavy-reuse', 'high', 'Used like a bank account',
        `${b.receiveCount.toLocaleString('en-US')} receipts on one address make it a stable identifier, the easiest kind for analytics firms to label.`,
        BTC_WEIGHTS.heavyReuse,
      ));
    }
  }

  if (b.coInputCount > 0) {
    findings.push(finding(
      'btc-common-input', 'critical', 'Linked to your other addresses',
      `This address was spent together with ${b.coInputCount.toLocaleString('en-US')} other address${b.coInputCount > 1 ? 'es' : ''} in the same transaction. The common-input heuristic treats all of them as one owner, merging their histories.`,
      BTC_WEIGHTS.commonInput,
    ));
  }

  if (b.changeTypeMatches >= 2) {
    findings.push(finding(
      'btc-change-detectable', 'medium', 'Change outputs are identifiable',
      `In ${b.changeTypeMatches.toLocaleString('en-US')} payments only one output used your address type, marking it as change. That reveals which output was the payment and follows your coins to the next address.`,
      BTC_WEIGHTS.changeDetectable,
    ));
  }

  if (b.outTxs >= 3 && b.roundPayments / b.outTxs >= 0.3) {
    findings.push(finding(
      'btc-round-payments', 'medium', 'Round-number payments',
      `${b.roundPayments.toLocaleString('en-US')} of ${b.outTxs.toLocaleString('en-US')} spends include a round amount. The round output is the payment; the odd one is your change.`,
      BTC_WEIGHTS.roundPayments,
    ));
  }

  if (b.consolidations > 0) {
    findings.push(finding(
      'btc-consolidation', 'high', 'UTXO consolidation',
      `${b.consolidations.toLocaleString('en-US')} transaction${b.consolidations > 1 ? 's' : ''} merged 5+ coins at once. Consolidation publicly joins the history of every coin involved.`,
      BTC_WEIGHTS.consolidation,
    ));
  }

  if (b.batchFundings > 0) {
    findings.push(finding(
      'btc-batch-funding', 'high', 'Funded by batch payouts',
      `${b.batchFundings.toLocaleString('en-US')} deposit${b.batchFundings > 1 ? 's' : ''} arrived in transactions with 10+ outputs, the typical shape of exchange withdrawals. If that exchange knows you, it can link you to this address.`,
      BTC_WEIGHTS.batchFunding,
    ));
  }

  const exchanges = data.counterpartyLabels.filter((c) => c.entityType === 'cex');
  if (exchanges.length > 0 || data.identity?.entityType === 'cex') {
    const names = [...new Set(exchanges.map((e) => e.label))].filter(Boolean).slice(0, 3).join(', ');
    findings.push(finding(
      'btc-known-exchange', 'critical', 'Direct exchange interaction',
      data.identity?.entityType === 'cex'
        ? `This address is publicly labeled as ${data.identity.name}.`
        : `Transacted directly with labeled exchange addresses (${names}). Exchanges hold KYC records and share them with analytics firms and authorities.`,
      BTC_WEIGHTS.knownExchange,
    ));
  }

  const timestamps = data.transfers.map((t) => t.timestamp).filter(Boolean);
  const tz = inferTimezone(timestamps);
  if (tz && tz.confidence >= 0.5) {
    findings.push(finding(
      'timezone-inference', 'high', 'Timezone inferred from activity',
      `Confirmation times suggest a sleep window consistent with UTC${tz.offset >= 0 ? '+' : ''}${tz.offset} (${Math.round(tz.confidence * 100)}% confidence). Block times lag broadcasts by minutes, so this is approximate but still narrows your region.`,
      BTC_WEIGHTS.timezone,
    ));
  }

  if (data.transfers.length >= 30) {
    const weekday = data.transfers.filter((t) => { const d = new Date(t.timestamp * 1000).getUTCDay(); return d !== 0 && d !== 6; }).length;
    const ratio = weekday / data.transfers.length;
    if (ratio > 0.85) {
      findings.push(finding(
        'weekday-pattern', 'medium', 'Strong weekday pattern',
        `${Math.round(ratio * 100)}% of activity lands on weekdays, suggesting a work schedule.`,
        BTC_WEIGHTS.weekday,
      ));
    }
  }

  if (b.dustReceived >= 2) {
    findings.push(finding(
      'btc-dust', 'medium', 'Dust received',
      `${b.dustReceived.toLocaleString('en-US')} tiny unsolicited payments (≤1,000 sats). Spending dust alongside your other coins links them for whoever sent it.`,
      BTC_WEIGHTS.dust,
    ));
  }

  if (b.addressType === 'p2pkh' || b.addressType === 'p2sh') {
    findings.push(finding(
      'btc-legacy-script', 'low', 'Distinctive address type',
      `${b.addressType === 'p2pkh' ? 'Legacy (1…)' : 'P2SH (3…)'} addresses are a shrinking minority, which makes your transactions and change easier to single out.`,
      BTC_WEIGHTS.legacyScript,
    ));
  }

  if (data.firstActivityTimestamp && (Date.now() / 1000 - data.firstActivityTimestamp) / 86400 >= 365) {
    findings.push(finding(
      'account-age', 'low', 'Long public history',
      'Over a year of permanent, public history gives analysts more data to correlate.',
      BTC_WEIGHTS.longHistory,
    ));
  }

  if (b.balanceSats > 0) {
    findings.push(finding(
      'btc-public-balance', 'low', 'Balance is public',
      'Anyone with this address can see exactly how much it holds, in real time.',
      BTC_WEIGHTS.publicBalance,
    ));
  }

  const deduction = findings.reduce((s, f) => s + f.deduction, 0);
  let score = BASE_SCORE - deduction;
  if (data.totalTransactions <= BONUSES.freshWalletMaxTxs) score += BONUSES.freshWallet;
  if (!findings.some((f) => f.id === 'btc-known-exchange' || f.id === 'btc-batch-funding')) score += BONUSES.noExchangeLinks;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: scoreToGrade(score),
    findings: findings.sort((a, c) => c.deduction - a.deduction),
    timezone: tz,
    counterpartySummary: {
      total: data.counterpartyLabels.length,
      labeled: data.counterpartyLabels.filter((c) => c.label).length,
      exchanges: exchanges.length,
    },
  };
}
