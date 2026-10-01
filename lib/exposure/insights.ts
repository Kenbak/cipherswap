import { WalletScanData } from './types';
import { isKnownExchange } from './known-exchanges';

export interface FavoriteCounterparty {
  address: string;
  label?: string;
  isExchange: boolean;
  count: number;
}

export interface BiggestTransfer {
  amount: number;
  direction: 'in' | 'out';
  counterparty: string;
  counterpartyLabel?: string;
}

export interface ExchangeLedgerEntry {
  label: string;
  inCount: number;
  outCount: number;
  net: 'deposit' | 'withdraw' | 'balanced';
}

export interface TopCounterparty {
  address: string;
  label?: string;
  isExchange: boolean;
  count: number;
}

export interface WalletInsights {
  favoriteCounterparty: FavoriteCounterparty | null;
  topCounterparties: TopCounterparty[];
  favoriteHour: { hour: number; share: number } | null;
  favoriteDay: { day: number; share: number } | null;
  biggestTransfer: BiggestTransfer | null;
  roundNumberBias: { share: number; count: number } | null;
  netFlowSol: number;
  totalVolumeSol: number;
  activityHeatmap: number[][];
  heatmapPeak: number;
  exchangeLedger: ExchangeLedgerEntry[];
  bridgedVia: string[];
  solDomain: string | null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BRIDGE_SOURCES: Record<string, string> = {
  CCTP: 'Circle CCTP',
  WORMHOLE: 'Wormhole',
  PORTAL: 'Portal Bridge',
  ALLBRIDGE: 'Allbridge',
  DEBRIDGE: 'deBridge',
  MAYAN: 'Mayan',
};

function isRoundNumber(n: number): boolean {
  if (n < 0.1) return false;
  // Whole numbers, halves, or clean tenths at scale (1, 5, 10, 2.5, 0.5, 100…)
  const scaled = Math.round(n * 100) / 100;
  return scaled % 1 === 0 || scaled % 0.5 === 0;
}

export function deriveInsights(data: WalletScanData): WalletInsights {
  const { transfers, transactionSources, identity } = data;
  const self = data.address;

  // ── Counterparty frequency (native + token) ──
  const counterpartyCount = new Map<string, number>();
  for (const t of transfers) {
    const other = t.direction === 'out' ? t.to : t.from;
    if (other && other !== self) {
      counterpartyCount.set(other, (counterpartyCount.get(other) || 0) + 1);
    }
  }

  const labelFor = (addr: string): string | undefined =>
    data.counterpartyLabels.find(c => c.address === addr)?.label || isKnownExchange(addr)?.label;

  let favoriteCounterparty: FavoriteCounterparty | null = null;
  for (const [addr, count] of counterpartyCount) {
    if (!favoriteCounterparty || count > favoriteCounterparty.count) {
      const label = labelFor(addr);
      favoriteCounterparty = {
        address: addr,
        label,
        isExchange: !!isKnownExchange(addr) ||
          data.counterpartyLabels.find(c => c.address === addr)?.entityType === 'cex',
        count,
      };
    }
  }

  // ── Top counterparties (sorted by interaction count) ──
  const topCounterparties: TopCounterparty[] = Array.from(counterpartyCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([addr, count]) => ({
      address: addr,
      label: labelFor(addr),
      isExchange: !!isKnownExchange(addr) ||
        data.counterpartyLabels.find(c => c.address === addr)?.entityType === 'cex',
      count,
    }));

  // ── Temporal: hour + day histograms + 7×24 heatmap ──
  const hourHist = new Array(24).fill(0);
  const dayHist = new Array(7).fill(0);
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let timestamped = 0;

  for (const t of transfers) {
    if (!t.timestamp) continue;
    const d = new Date(t.timestamp * 1000);
    const h = d.getUTCHours();
    const day = d.getUTCDay();
    hourHist[h]++;
    dayHist[day]++;
    heatmap[day][h]++;
    timestamped++;
  }

  let favoriteHour: WalletInsights['favoriteHour'] = null;
  if (timestamped >= 10) {
    const peakHour = hourHist.indexOf(Math.max(...hourHist));
    favoriteHour = { hour: peakHour, share: hourHist[peakHour] / timestamped };
  }

  let favoriteDay: WalletInsights['favoriteDay'] = null;
  if (timestamped >= 10) {
    const peakDay = dayHist.indexOf(Math.max(...dayHist));
    favoriteDay = { day: peakDay, share: dayHist[peakDay] / timestamped };
  }

  const heatmapPeak = Math.max(1, ...heatmap.flat());

  // ── Native (SOL) money movement ──
  const nativeTransfers = transfers.filter(t => t.type === 'native' && t.amount > 0);
  let inflow = 0;
  let outflow = 0;
  let biggestTransfer: BiggestTransfer | null = null;
  let roundCount = 0;
  let outCount = 0;

  for (const t of nativeTransfers) {
    if (t.direction === 'in') inflow += t.amount;
    else {
      outflow += t.amount;
      outCount++;
      if (isRoundNumber(t.amount)) roundCount++;
    }
    if (!biggestTransfer || t.amount > biggestTransfer.amount) {
      const cp = t.direction === 'out' ? t.to : t.from;
      biggestTransfer = {
        amount: t.amount,
        direction: t.direction,
        counterparty: cp,
        counterpartyLabel: labelFor(cp),
      };
    }
  }

  const roundNumberBias =
    outCount >= 5 ? { share: roundCount / outCount, count: roundCount } : null;

  // ── Exchange ledger (who you deposit to / withdraw from) ──
  const ledger = new Map<string, { inCount: number; outCount: number }>();
  for (const t of transfers) {
    const other = t.direction === 'out' ? t.to : t.from;
    if (!other) continue;
    const label =
      data.counterpartyLabels.find(c => c.address === other && c.entityType === 'cex')?.label ||
      isKnownExchange(other)?.label;
    if (!label) continue;
    const entry = ledger.get(label) || { inCount: 0, outCount: 0 };
    if (t.direction === 'out') entry.outCount++;
    else entry.inCount++;
    ledger.set(label, entry);
  }

  const exchangeLedger: ExchangeLedgerEntry[] = Array.from(ledger.entries())
    .map(([label, { inCount, outCount }]) => ({
      label,
      inCount,
      outCount,
      net:
        outCount > inCount ? ('deposit' as const)
        : inCount > outCount ? ('withdraw' as const)
        : ('balanced' as const),
    }))
    .sort((a, b) => b.inCount + b.outCount - (a.inCount + a.outCount));

  // ── Bridges used (cross-chain identity link) ──
  const bridgedVia: string[] = [];
  for (const [src, name] of Object.entries(BRIDGE_SOURCES)) {
    if (transactionSources[src]) bridgedVia.push(name);
  }

  // ── .sol domain / name ──
  let solDomain: string | null = null;
  const dom = identity?.domain || identity?.name;
  if (dom) solDomain = dom;

  return {
    favoriteCounterparty,
    topCounterparties,
    favoriteHour,
    favoriteDay,
    biggestTransfer,
    roundNumberBias,
    netFlowSol: inflow - outflow,
    totalVolumeSol: inflow + outflow,
    activityHeatmap: heatmap,
    heatmapPeak,
    exchangeLedger,
    bridgedVia,
    solDomain,
  };
}

export function dayName(day: number): string {
  return DAY_NAMES[day] ?? '';
}

export function formatHourUtc(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 UTC`;
}

export function shortAddr(addr: string): string {
  return addr.slice(0, 4) + '…' + addr.slice(-4);
}
