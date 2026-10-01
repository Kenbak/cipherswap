import { formatUnits } from 'viem';
import type { CounterpartyLabel, EthereumFacts, NftAsset, TokenBalance, Transfer, WalletScanData } from './types';
import { knownEthExchange, knownEthMixer, looksLikeExchangeLabel } from './ethereum-entities';

export { isValidEthereumAddress } from './ethereum-entities';

/**
 * Ethereum scanner over the public Blockscout API (no key). Runs server-side so
 * the user's IP never reaches the explorer.
 */
const BLOCKSCOUT = 'https://eth.blockscout.com/api/v2';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_TX_PAGES = 4; // 50 per page → latest ~200 txs
const MAX_TOKEN_TRANSFER_PAGES = 2;
const DEPOSIT_PROBES = 5;
const APPROVAL_METHODS = new Set(['approve', 'setApprovalForAll', 'increaseAllowance', 'permit']);

interface BsTag { name: string; slug: string; tagType: string }
interface BsAddressRef {
  hash: string;
  is_contract?: boolean;
  name?: string | null;
  ens_domain_name?: string | null;
  metadata?: { tags?: BsTag[] } | null;
}
interface BsAddress extends BsAddressRef {
  coin_balance: string | null;
  exchange_rate: string | null;
}
interface BsTx {
  hash: string;
  timestamp: string;
  from: BsAddressRef;
  to: BsAddressRef | null;
  value: string;
  method: string | null;
  status?: string;
}
interface BsTokenRef {
  address_hash: string;
  symbol: string | null;
  name: string | null;
  decimals: string | null;
  exchange_rate: string | null;
  reputation?: string | null;
  type: string;
}
interface BsTokenTransfer {
  transaction_hash: string;
  timestamp: string;
  from: BsAddressRef;
  to: BsAddressRef;
  token: BsTokenRef;
  total: { value?: string | null; decimals?: string | null } | null;
}
interface BsTokenHolding { token: BsTokenRef; value: string }
interface BsNft { id: string; token: BsTokenRef; metadata?: { name?: string } | null }
interface BsPage<T> { items: T[]; next_page_params: Record<string, string | number> | null }

/** Blockscout's keyless tier rate-limits bursts, so requests share a small pool. */
const MAX_CONCURRENT = 3;
let active = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function bs<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BLOCKSCOUT}${path}${qs ? `?${qs}` : ''}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await withSlot(() => fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: 'no-store' }));
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (res.status === 404) throw new Error('not-found');
    if (!res.ok) throw new Error(`Blockscout ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error('rate-limited');
}

async function pages<T>(path: string, params: Record<string, string | number>, max: number): Promise<T[]> {
  const out: T[] = [];
  let next: Record<string, string | number> | null = {};
  for (let i = 0; i < max && next; i++) {
    const page: BsPage<T> = await bs<BsPage<T>>(path, { ...params, ...next });
    out.push(...page.items);
    next = page.next_page_params;
  }
  return out;
}

/** Secondary data degrades the report instead of failing the scan. */
async function optional<T>(what: string, p: Promise<T>, fallback: T, missing: string[]): Promise<T> {
  try {
    return await p;
  } catch (err) {
    console.error(`Ethereum scan: ${what} unavailable:`, err instanceof Error ? err.message : err);
    missing.push(what);
    return fallback;
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const lc = (a: string | undefined | null) => (a ?? '').toLowerCase();
const toSeconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function amount(raw: string | null | undefined, decimals: number): number {
  if (!raw) return 0;
  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}

/** Public label from our list first, then Blockscout's name tags. */
function labelFor(ref: BsAddressRef): { label?: string; entityType?: string } {
  const mixer = knownEthMixer(ref.hash);
  if (mixer) return { label: mixer, entityType: 'mixer' };
  const exchange = knownEthExchange(ref.hash);
  if (exchange) return { label: exchange, entityType: 'cex' };
  const tag = ref.metadata?.tags?.find((t) => t.tagType === 'name')?.name;
  const label = tag || ref.ens_domain_name || undefined;
  if (label && looksLikeExchangeLabel(label)) return { label, entityType: 'cex' };
  return label ? { label } : {};
}

export async function scanEthereum(input: string): Promise<WalletScanData> {
  const missing: string[] = [];
  const emptyPage = { items: [], next_page_params: null };
  const [info, counters] = await Promise.all([
    bs<BsAddress>(`/addresses/${input}`),
    optional('counters', bs<{ transactions_count?: string }>(`/addresses/${input}/counters`), { transactions_count: '0' }, missing),
  ]);
  const address = info.hash;
  const self = lc(address);

  const [recentTxs, earliestPage, tokenTransfers, holdingsPage, nftPage] = await Promise.all([
    pages<BsTx>(`/addresses/${address}/transactions`, {}, MAX_TX_PAGES),
    optional('first transactions', bs<BsPage<BsTx>>(`/addresses/${address}/transactions`, { sort: 'block_number', order: 'asc' }).then((p) => p.items), [] as BsTx[], missing),
    optional('token transfers', pages<BsTokenTransfer>(`/addresses/${address}/token-transfers`, { type: 'ERC-20' }, MAX_TOKEN_TRANSFER_PAGES), [], missing),
    optional('token balances', bs<BsPage<BsTokenHolding>>(`/addresses/${address}/tokens`, { type: 'ERC-20' }), emptyPage, missing),
    optional('NFTs', bs<BsPage<BsNft>>(`/addresses/${address}/nft`, { type: 'ERC-721,ERC-1155' }), emptyPage, missing),
  ]);

  const seen = new Set<string>();
  const txs: BsTx[] = [];
  for (const tx of [...recentTxs, ...earliestPage]) {
    if (seen.has(tx.hash)) continue;
    seen.add(tx.hash);
    txs.push(tx);
  }

  const transfers: Transfer[] = [];
  const refs = new Map<string, BsAddressRef>();
  const programFrequency: Record<string, number> = {};
  const programLabels: Record<string, string> = {};
  const mixerNames = new Set<string>();
  let firstTimestamp: number | null = null;
  let outTxs = 0;
  let approvals = 0;
  let mixerTxs = 0;

  for (const tx of txs) {
    const ts = toSeconds(tx.timestamp);
    if (!firstTimestamp || ts < firstTimestamp) firstTimestamp = ts;
    const outgoing = lc(tx.from.hash) === self;
    if (outgoing) outTxs++;
    if (outgoing && tx.method && APPROVAL_METHODS.has(tx.method)) approvals++;

    const other = outgoing ? tx.to : tx.from;
    if (!other || lc(other.hash) === ZERO_ADDRESS) continue;
    refs.set(lc(other.hash), other);

    const mixer = knownEthMixer(other.hash);
    if (mixer) {
      mixerTxs++;
      mixerNames.add(mixer);
    }
    if (outgoing && other.is_contract) {
      programFrequency[other.hash] = (programFrequency[other.hash] ?? 0) + 1;
      const name = mixer ?? other.metadata?.tags?.find((t) => t.tagType === 'name')?.name ?? other.name;
      if (name) programLabels[other.hash] = name;
    }

    const value = amount(tx.value, 18);
    if (value > 0) {
      transfers.push({
        signature: tx.hash,
        timestamp: ts,
        from: tx.from.hash,
        to: tx.to?.hash ?? '',
        amount: value,
        direction: outgoing ? 'out' : 'in',
        type: 'native',
      });
    }
  }

  let spamTransfersIn = 0;
  for (const tt of tokenTransfers) {
    const outgoing = lc(tt.from.hash) === self;
    const other = outgoing ? tt.to : tt.from;
    const spam = !!tt.token.reputation && tt.token.reputation !== 'ok';
    if (spam) {
      if (!outgoing) spamTransfersIn++;
      continue;
    }
    if (lc(other.hash) === ZERO_ADDRESS) continue;
    refs.set(lc(other.hash), other);
    transfers.push({
      signature: tt.transaction_hash,
      timestamp: toSeconds(tt.timestamp),
      from: tt.from.hash,
      to: tt.to.hash,
      amount: amount(tt.total?.value, Number(tt.token.decimals ?? 18)),
      mint: tt.token.address_hash,
      direction: outgoing ? 'out' : 'in',
      type: 'token',
    });
  }

  // Counterparties: who this address actually moved value with.
  const counterpartyCounts = new Map<string, { out: number; via: 'native' | 'token' }>();
  const counterparties = new Set<string>();
  for (const t of transfers) {
    const other = t.direction === 'out' ? t.to : t.from;
    if (!other || lc(other) === self) continue;
    counterparties.add(lc(other));
    if (t.direction === 'out') {
      const c = counterpartyCounts.get(lc(other)) ?? { out: 0, via: t.type === 'token' ? 'token' : 'native' };
      c.out++;
      counterpartyCounts.set(lc(other), c);
    }
  }

  const labels = new Map<string, CounterpartyLabel>();
  for (const key of counterparties) {
    const ref = refs.get(key);
    if (!ref) continue;
    labels.set(key, { address: ref.hash, ...labelFor(ref) });
  }

  // Exchange deposit addresses: an unlabeled EOA you pay that sweeps everything
  // to one exchange. These are unique per exchange account.
  const depositAddresses: EthereumFacts['depositAddresses'] = [];
  const candidates = [...counterpartyCounts.entries()]
    .filter(([key]) => !labels.get(key)?.label && refs.get(key)?.is_contract === false)
    .sort((a, b) => b[1].out - a[1].out)
    .slice(0, DEPOSIT_PROBES);
  await Promise.all(candidates.map(async ([key, { via }]) => {
    const hash = refs.get(key)!.hash;
    try {
      const destinations: BsAddressRef[] = via === 'token'
        ? (await bs<BsPage<BsTokenTransfer>>(`/addresses/${hash}/token-transfers`, { type: 'ERC-20', filter: 'from' })).items.map((t) => t.to)
        : (await bs<BsPage<BsTx>>(`/addresses/${hash}/transactions`, { filter: 'from' })).items
          .filter((t) => t.to && t.value !== '0')
          .map((t) => t.to!);
      if (destinations.length === 0) return;
      const tally = new Map<string, number>();
      for (const d of destinations) {
        const ex = labelFor(d);
        if (ex.entityType === 'cex' && ex.label) tally.set(ex.label, (tally.get(ex.label) ?? 0) + 1);
      }
      const [top] = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      if (top && top[1] / destinations.length >= 0.8) {
        depositAddresses.push({ address: hash, exchange: top[0] });
        labels.set(key, { address: hash, label: `${top[0]} deposit`, entityType: 'cex' });
      }
    } catch (err) {
      console.error('Deposit probe failed:', err instanceof Error ? err.message : err);
    }
  }));

  // First funding: earliest inbound ETH.
  const firstIn = [...earliestPage]
    .sort((a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp))
    .find((t) => lc(t.from.hash) !== self && t.value !== '0');
  const funder = firstIn ? labelFor(firstIn.from) : null;
  const fundedBy = firstIn
    ? {
        address: firstIn.from.hash,
        label: funder?.label,
        entityType: funder?.entityType,
        amount: amount(firstIn.value, 18),
        timestamp: toSeconds(firstIn.timestamp),
      }
    : null;

  const ethRate = info.exchange_rate ? Number(info.exchange_rate) : null;
  const ethBalance = amount(info.coin_balance, 18);
  let totalUsd = ethRate ? ethBalance * ethRate : 0;
  const tokens: TokenBalance[] = [];
  let spamHoldings = 0;
  for (const h of holdingsPage.items) {
    if (h.token.reputation && h.token.reputation !== 'ok') {
      spamHoldings++;
      continue;
    }
    const decimals = Number(h.token.decimals ?? 18);
    const qty = amount(h.value, decimals);
    const usd = h.token.exchange_rate ? qty * Number(h.token.exchange_rate) : null;
    if (usd != null && Number.isFinite(usd)) totalUsd += usd;
    tokens.push({ mint: h.token.address_hash, amount: qty, decimals, symbol: h.token.symbol ?? undefined, name: h.token.name ?? undefined, usdValue: usd });
  }
  const nfts: NftAsset[] = nftPage.items
    .filter((n) => !n.token.reputation || n.token.reputation === 'ok')
    .map((n) => ({ mint: `${n.token.address_hash}:${n.id}`, name: n.metadata?.name ?? undefined, collection: n.token.name ?? undefined }));

  // The address endpoint often omits tags that the same address carries inside tx references.
  const selfRef = txs.map((t) => (lc(t.from.hash) === self ? t.from : t.to)).find((r) => r?.metadata?.tags?.length);
  const selfTags = info.metadata?.tags?.length ? info.metadata.tags : selfRef?.metadata?.tags ?? [];
  const selfLabel = labelFor({ ...info, metadata: { tags: selfTags } });
  const ens = info.ens_domain_name ?? null;
  const nameTags = selfTags.filter((t) => t.tagType === 'name').map((t) => t.name);
  const ownLabel = selfLabel.entityType ? selfLabel.label : undefined;
  const identity = ens || nameTags.length || ownLabel
    ? { name: nameTags[0] ?? ownLabel ?? ens ?? undefined, domain: ens ?? undefined, entityType: selfLabel.entityType, labels: ownLabel && !nameTags.length ? [ownLabel] : nameTags }
    : null;

  const ethereum: EthereumFacts = {
    ens,
    isContract: !!info.is_contract,
    outTxs,
    approvals,
    mixerTxs,
    mixers: [...mixerNames],
    depositAddresses,
    spamTokens: spamHoldings + spamTransfersIn,
    tokenCount: tokens.length,
    tokenCountCapped: !!holdingsPage.next_page_params,
    nftCount: nfts.length,
    contractsUsed: Object.keys(programFrequency).length,
    missing,
  };

  return {
    chain: 'ethereum',
    nativeSymbol: 'ETH',
    address,
    transfers,
    balances: { sol: 0, native: ethBalance, tokens, nfts, totalUsdValue: ethRate ? totalUsd : undefined },
    identity,
    fundedBy,
    counterpartyLabels: [...labels.values()],
    totalTransactions: Math.max(Number(counters.transactions_count ?? 0) || 0, txs.length),
    analyzedTxs: txs.length,
    firstActivityTimestamp: firstTimestamp,
    programs: Object.keys(programFrequency),
    programFrequency,
    programLabels,
    transactionSources: {},
    transactionTypes: {},
    ethereum,
  };
}
