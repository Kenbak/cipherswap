import { NextRequest, NextResponse } from 'next/server';
import { WalletScanData, Transfer, CounterpartyLabel, ExposureChain, parseExposureChain } from '@/lib/exposure/types';
import { isKnownExchange } from '@/lib/exposure/known-exchanges';
import { isValidBitcoinAddress, scanBitcoin } from '@/lib/exposure/bitcoin';
import { isValidEthereumAddress, scanEthereum } from '@/lib/exposure/ethereum';

const CHAIN_LABEL: Record<ExposureChain, string> = { solana: 'Solana', bitcoin: 'Bitcoin', ethereum: 'Ethereum' };
const VALIDATORS: Record<ExposureChain, (a: string) => boolean> = {
  solana: isValidSolanaAddress,
  bitcoin: isValidBitcoinAddress,
  ethereum: isValidEthereumAddress,
};

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_BASE = 'https://api.helius.xyz';

/* ────────────────────────────────────────────────────────────
 *  COST CONTROL
 *
 *  Developer plan: 10M credits/mo = 10,000 scans at ~1,000 credits each.
 *  Three layers prevent abuse:
 *    1. Result cache  – same address within CACHE_TTL_MS returns cached data (0 credits)
 *    2. Per-IP limit  – max IP_HOURLY_LIMIT fresh scans per IP per hour
 *    3. Global daily cap – hard stop at DAILY_SCAN_CAP fresh scans/day
 *
 *  All state is in-memory. Resets on deploy, which is fine — the caps are
 *  soft safety nets, not billing-critical.
 * ──────────────────────────────────────────────────────────── */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const IP_HOURLY_LIMIT = 10;
const DAILY_SCAN_CAP = 300;

// Result cache: address → { data, timestamp }
const resultCache = new Map<string, { data: WalletScanData; ts: number }>();

// Per-IP rate limit: ip → timestamps of recent fresh scans
const ipScans = new Map<string, number[]>();

// Global daily counter: { day string, count }
let dailyCounter = { day: '', count: 0 };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkIpLimit(ip: string, now: number): boolean {
  const hourAgo = now - 60 * 60 * 1000;
  const timestamps = (ipScans.get(ip) || []).filter(t => t > hourAgo);
  ipScans.set(ip, timestamps);
  return timestamps.length < IP_HOURLY_LIMIT;
}

function recordIpScan(ip: string, now: number): void {
  const hourAgo = now - 60 * 60 * 1000;
  const timestamps = (ipScans.get(ip) || []).filter(t => t > hourAgo);
  timestamps.push(now);
  ipScans.set(ip, timestamps);
}

function checkDailyLimit(now: number): boolean {
  const today = new Date(now).toISOString().slice(0, 10);
  if (dailyCounter.day !== today) {
    dailyCounter = { day: today, count: 0 };
  }
  return dailyCounter.count < DAILY_SCAN_CAP;
}

function recordDailyScan(now: number): void {
  const today = new Date(now).toISOString().slice(0, 10);
  if (dailyCounter.day !== today) {
    dailyCounter = { day: today, count: 0 };
  }
  dailyCounter.count++;
}

// Evict stale cache entries periodically
function evictStaleCache(now: number): void {
  if (resultCache.size > 500) {
    for (const [key, entry] of resultCache) {
      if (now - entry.ts > CACHE_TTL_MS) resultCache.delete(key);
    }
  }
}

/* ──────────────────────────────────────────────────────────── */

function isValidSolanaAddress(address: string): boolean {
  if (address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

async function heliusFetch(path: string, options?: RequestInit): Promise<any> {
  const url = `${HELIUS_BASE}${path}${path.includes('?') ? '&' : '?'}api-key=${HELIUS_API_KEY}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('rate-limited');
    if (res.status === 403) return null;
    throw new Error(`Helius ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string = typeof body?.address === 'string' ? body.address.trim() : '';
    const chain = parseExposureChain(body?.chain);

    if (chain === 'solana' && !HELIUS_API_KEY) {
      return NextResponse.json({ success: false, error: 'Scanner not configured' }, { status: 503 });
    }
    if (!VALIDATORS[chain](address)) {
      return NextResponse.json({ success: false, error: `Invalid ${CHAIN_LABEL[chain]} address` }, { status: 400 });
    }

    const now = Date.now();
    const ip = getClientIp(req);
    const cacheKey = `${chain}:${chain === 'ethereum' ? address.toLowerCase() : address}`;

    // ── Layer 1: Return cached result if fresh ──
    const cached = resultCache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data, cached: true });
    }

    // ── Layer 2: Per-IP hourly limit ──
    if (!checkIpLimit(ip, now)) {
      return NextResponse.json(
        { success: false, error: `Rate limited. Max ${IP_HOURLY_LIMIT} scans per hour.` },
        { status: 429 },
      );
    }

    // ── Layer 3: Global daily cap ──
    if (!checkDailyLimit(now)) {
      return NextResponse.json(
        { success: false, error: 'Scanner is at capacity for today. Try again tomorrow.' },
        { status: 429 },
      );
    }

    // Record this scan against the limits
    recordIpScan(ip, now);
    recordDailyScan(now);
    evictStaleCache(now);

    if (chain === 'bitcoin' || chain === 'ethereum') {
      const scanData = chain === 'bitcoin' ? await scanBitcoin(address) : await scanEthereum(address);
      if (!scanData.ethereum?.missing.length) resultCache.set(cacheKey, { data: scanData, ts: now });
      return NextResponse.json({ success: true, data: scanData });
    }

    // ── Fetch data from Helius ──

    const MAX_PAGES = 4;
    const PAGE_SIZE = 100;

    async function fetchTxPage(before?: string): Promise<any[]> {
      const q = `/v0/addresses/${address}/transactions?limit=${PAGE_SIZE}${before ? `&before=${before}` : ''}`;
      const page = await heliusFetch(q);
      return Array.isArray(page) ? page : [];
    }

    async function fetchAllBalances(): Promise<{ balances: any[]; nfts: any[]; totalUsd: number }> {
      const all: any[] = [];
      let nfts: any[] = [];
      let totalUsd = 0;
      for (let page = 1; page <= 3; page++) {
        const res = await heliusFetch(`/v1/wallet/${address}/balances?showNfts=true&showNative=true&page=${page}`);
        if (!res) break;
        all.push(...(res.balances || []));
        if (page === 1) nfts = res.nfts || [];
        totalUsd += res.totalUsdValue || 0;
        if (!res.pagination?.hasMore) break;
      }
      return { balances: all, nfts, totalUsd };
    }

    // Free endpoints + paid endpoints in parallel.
    // Paid endpoints (identity, funded-by, batch-identity) return null on 403.
    const [firstPageRes, balancesRes, identityRes, fundedByRes] = await Promise.allSettled([
      fetchTxPage(),
      fetchAllBalances(),
      heliusFetch(`/v1/wallet/${address}/identity`),
      heliusFetch(`/v1/wallet/${address}/funded-by`),
    ]);

    const rawTxs: any[] = firstPageRes.status === 'fulfilled' ? firstPageRes.value : [];

    let cursor = rawTxs.length > 0 ? rawTxs[rawTxs.length - 1]?.signature : undefined;
    for (let page = 1; page < MAX_PAGES && cursor && rawTxs.length >= page * PAGE_SIZE; page++) {
      try {
        const next = await fetchTxPage(cursor);
        if (next.length === 0) break;
        rawTxs.push(...next);
        cursor = next[next.length - 1]?.signature;
      } catch {
        break;
      }
    }

    // ── Parse transactions ──

    const transfers: Transfer[] = [];
    const programSet = new Set<string>();
    const programFrequency: Record<string, number> = {};
    const transactionSources: Record<string, number> = {};
    const transactionTypes: Record<string, number> = {};
    let firstTimestamp: number | null = null;

    for (const tx of rawTxs) {
      const ts = tx.timestamp || 0;
      if (ts && (!firstTimestamp || ts < firstTimestamp)) {
        firstTimestamp = ts;
      }

      if (tx.source) {
        transactionSources[tx.source] = (transactionSources[tx.source] || 0) + 1;
      }
      if (tx.type) {
        transactionTypes[tx.type] = (transactionTypes[tx.type] || 0) + 1;
      }

      if (tx.instructions) {
        for (const ix of tx.instructions) {
          if (ix.programId) {
            programSet.add(ix.programId);
            programFrequency[ix.programId] = (programFrequency[ix.programId] || 0) + 1;
          }
        }
      }

      if (tx.nativeTransfers) {
        for (const nt of tx.nativeTransfers) {
          const direction = nt.toUserAccount === address ? 'in' : 'out';
          transfers.push({
            signature: tx.signature,
            timestamp: ts,
            from: nt.fromUserAccount || '',
            to: nt.toUserAccount || '',
            amount: (nt.amount || 0) / 1e9,
            direction,
            type: 'native',
          });
        }
      }

      if (tx.tokenTransfers) {
        for (const tt of tx.tokenTransfers) {
          const direction = tt.toUserAccount === address ? 'in' : 'out';
          transfers.push({
            signature: tx.signature,
            timestamp: ts,
            from: tt.fromUserAccount || '',
            to: tt.toUserAccount || '',
            amount: tt.tokenAmount || 0,
            mint: tt.mint,
            direction,
            type: 'token',
          });
        }
      }
    }

    // ── Parse balances ──

    const rawBalances = balancesRes.status === 'fulfilled' && balancesRes.value
      ? balancesRes.value as any
      : null;

    const balanceItems: any[] = rawBalances?.balances || [];
    const solEntry = balanceItems.find((b: any) => b.symbol === 'SOL' && b.mint?.startsWith('So1'));
    const solBalance = solEntry?.balance ?? 0;
    const totalUsdValue = rawBalances?.totalUsd ?? 0;

    const tokens = balanceItems
      .filter((b: any) => b.symbol !== 'SOL' || !b.mint?.startsWith('So1'))
      .map((t: any) => ({
        mint: t.mint || '',
        amount: t.balance || 0,
        decimals: t.decimals || 0,
        symbol: t.symbol,
        name: t.name,
        usdValue: t.usdValue ?? null,
      }));

    const nfts = (rawBalances?.nfts || []).map((n: any) => ({
      mint: n.mint || '',
      name: n.name,
      collection: n.collectionName,
      image: n.imageUri,
    }));

    // ── Parse identity (paid, may be null) ──

    const identityRaw = identityRes.status === 'fulfilled' ? identityRes.value : null;
    const identity = identityRaw
      ? {
          name: identityRaw.name || identityRaw.displayName,
          domain: identityRaw.domain,
          entityType: identityRaw.entityType || identityRaw.type || identityRaw.category,
          labels: identityRaw.tags || identityRaw.labels || [],
        }
      : null;

    // ── Parse funding source (paid, may be null) ──

    const fundedByRaw = fundedByRes.status === 'fulfilled' ? fundedByRes.value : null;
    let fundedBy = null;
    if (fundedByRaw?.funder) {
      const srcAddr = fundedByRaw.funder;
      const exchangeInfo = isKnownExchange(srcAddr);
      fundedBy = {
        address: srcAddr,
        label: fundedByRaw.funderName || exchangeInfo?.label || undefined,
        entityType: fundedByRaw.funderType || (exchangeInfo ? 'cex' : undefined),
        amount: fundedByRaw.amount,
        timestamp: fundedByRaw.timestamp,
      };
    }

    // Use funded-by timestamp as firstActivityTimestamp if it's earlier
    if (fundedBy?.timestamp && (!firstTimestamp || fundedBy.timestamp < firstTimestamp)) {
      firstTimestamp = fundedBy.timestamp;
    }

    // ── Build counterparty labels ──

    const counterpartyAddresses = new Set<string>();
    for (const t of transfers) {
      if (t.direction === 'out' && t.to && t.to !== address) counterpartyAddresses.add(t.to);
      if (t.direction === 'in' && t.from && t.from !== address) counterpartyAddresses.add(t.from);
    }

    const counterpartyLabels: CounterpartyLabel[] = [];
    for (const addr of counterpartyAddresses) {
      const exchange = isKnownExchange(addr);
      if (exchange) {
        counterpartyLabels.push({
          address: addr,
          label: exchange.label,
          entityType: 'cex',
        });
      } else {
        counterpartyLabels.push({ address: addr });
      }
    }

    // Batch-identity for unlabeled counterparties (paid, 100 credits for up to 100 addresses)
    const unlabeled = counterpartyLabels
      .filter(c => !c.label)
      .map(c => c.address)
      .slice(0, 100);

    if (unlabeled.length > 0) {
      try {
        const batchRes = await heliusFetch('/v1/wallet/batch-identity', {
          method: 'POST',
          body: JSON.stringify({ addresses: unlabeled }),
        });
        if (batchRes && Array.isArray(batchRes)) {
          for (const item of batchRes) {
            if (item.address && (item.name || item.category)) {
              const existing = counterpartyLabels.find(c => c.address === item.address);
              if (existing) {
                existing.label = item.name;
                existing.entityType = item.category || item.type;
              }
            }
          }
        }
      } catch {
        // Paid endpoint failed — continue with local labels only
      }
    }

    // ── Assemble and cache ──

    const scanData: WalletScanData = {
      chain: 'solana',
      nativeSymbol: 'SOL',
      address,
      transfers,
      balances: { sol: solBalance, native: solBalance, tokens, nfts, totalUsdValue },
      identity,
      fundedBy,
      counterpartyLabels,
      totalTransactions: rawTxs.length,
      firstActivityTimestamp: firstTimestamp,
      programs: Array.from(programSet),
      programFrequency,
      transactionSources,
      transactionTypes,
    };

    resultCache.set(cacheKey, { data: scanData, ts: now });

    return NextResponse.json({ success: true, data: scanData });
  } catch (error: any) {
    console.error('Exposure scan failed:', error?.message ?? error);
    const message = error.message === 'rate-limited'
      ? 'The data provider is rate limiting us. Please try again shortly.'
      : error.message === 'not-found'
        ? 'No on-chain history found for this address.'
        : 'Scan failed. Please try again.';
    const status = error.message === 'rate-limited' ? 429 : error.message === 'not-found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
