import { getOneClickTokens } from '../oneclick-tokens';
import type { BitcoinFacts, BtcAddressType, CounterpartyLabel, Transfer, WalletScanData } from './types';
import { btcAddressType } from './bitcoin-address';

export { isValidBitcoinAddress } from './bitcoin-address';

/**
 * Bitcoin scanner over the public Esplora API. Runs server-side so the user's
 * IP never reaches the explorer. Hosts are tried in order.
 */
const ESPLORA_HOSTS = ['https://blockstream.info/api', 'https://mempool.space/api'];
const MAX_CHAIN_PAGES = 8; // 25 confirmed txs per page → up to ~200 txs analysed
const REQUEST_TIMEOUT_MS = 10_000;

/** Public, widely documented custody addresses only. */
const KNOWN_BTC_ENTITIES: Record<string, string> = {
  bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h: 'Binance',
  '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo': 'Binance (cold)',
  bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97: 'Bitfinex (cold)',
  bc1ql49ydapnjafl5t2cp9zqpjwe6pdgmxy98859v2: 'Robinhood',
};

export function knownBtcEntity(address: string): string | undefined {
  return KNOWN_BTC_ENTITIES[address];
}

const SCRIPT_TYPE: Record<string, BtcAddressType> = {
  p2pkh: 'p2pkh', p2sh: 'p2sh', v0_p2wpkh: 'p2wpkh', v0_p2wsh: 'p2wsh', v1_p2tr: 'p2tr',
};

interface EsploraOut { scriptpubkey_address?: string; scriptpubkey_type: string; value: number }
interface EsploraTx {
  txid: string;
  vin: { prevout: EsploraOut | null; is_coinbase?: boolean }[];
  vout: EsploraOut[];
  status: { confirmed: boolean; block_time?: number };
}
interface EsploraAddress {
  chain_stats: { funded_txo_count: number; funded_txo_sum: number; spent_txo_count: number; spent_txo_sum: number; tx_count: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
}

async function esplora<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (const host of ESPLORA_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: 'no-store' });
      if (res.status === 429) throw new Error('rate-limited');
      if (!res.ok) throw new Error(`Esplora ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Bitcoin explorer unavailable');
}

async function btcUsdPrice(): Promise<number | null> {
  try {
    const btc = (await getOneClickTokens()).find((t) => t.blockchain === 'btc' && t.symbol === 'BTC');
    return btc?.price ?? null;
  } catch (err) {
    console.error('BTC price lookup failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** A payment amount with ≤ 3 significant digits in BTC (0.05, 0.125, 1.5) reads as human-chosen. */
function isRoundBtc(sats: number): boolean {
  if (sats < 100_000) return false;
  const s = String(sats).replace(/0+$/, '');
  return s.length <= 3;
}

export async function scanBitcoin(address: string): Promise<WalletScanData> {
  const [info, firstPage] = await Promise.all([
    esplora<EsploraAddress>(`/address/${address}`),
    esplora<EsploraTx[]>(`/address/${address}/txs`),
  ]);

  const txs = [...firstPage];
  let lastConfirmed = [...txs].reverse().find((t) => t.status.confirmed)?.txid;
  for (let page = 0; page < MAX_CHAIN_PAGES - 1 && lastConfirmed && txs.length < info.chain_stats.tx_count; page++) {
    try {
      const next = await esplora<EsploraTx[]>(`/address/${address}/txs/chain/${lastConfirmed}`);
      if (next.length === 0) break;
      txs.push(...next);
      lastConfirmed = next[next.length - 1].txid;
    } catch {
      break;
    }
  }

  const ownType = btcAddressType(address);
  const transfers: Transfer[] = [];
  const coInputs = new Set<string>();
  const counterparties = new Set<string>();
  let firstTimestamp: number | null = null;
  let consolidations = 0;
  let batchFundings = 0;
  let roundPayments = 0;
  let outTxs = 0;
  let changeTypeMatches = 0;
  let dustReceived = 0;
  let mixedInputTypes = 0;

  for (const tx of txs) {
    const ts = tx.status.block_time ?? Math.floor(Date.now() / 1000);
    if (tx.status.block_time && (!firstTimestamp || tx.status.block_time < firstTimestamp)) firstTimestamp = tx.status.block_time;

    const inputs = tx.vin.map((v) => v.prevout).filter((p): p is EsploraOut => !!p);
    const spentHere = inputs.filter((p) => p.scriptpubkey_address === address).reduce((s, p) => s + p.value, 0);
    const receivedHere = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0);
    const isSpend = spentHere > 0;

    if (isSpend) {
      outTxs++;
      for (const p of inputs) {
        if (p.scriptpubkey_address && p.scriptpubkey_address !== address) coInputs.add(p.scriptpubkey_address);
      }
      if (inputs.length >= 5) consolidations++;
      if (new Set(inputs.map((p) => p.scriptpubkey_type)).size > 1) mixedInputTypes++;

      const external = tx.vout.filter((o) => o.scriptpubkey_address && o.scriptpubkey_address !== address);
      if (external.some((o) => isRoundBtc(o.value)) && external.length >= 1) roundPayments++;
      // With two outputs where only one shares our script type, that one is almost certainly change.
      if (tx.vout.length === 2 && receivedHere === 0) {
        const matches = tx.vout.filter((o) => SCRIPT_TYPE[o.scriptpubkey_type] === ownType).length;
        if (matches === 1) changeTypeMatches++;
      }
      for (const o of external) {
        counterparties.add(o.scriptpubkey_address!);
        transfers.push({ signature: tx.txid, timestamp: ts, from: address, to: o.scriptpubkey_address!, amount: o.value / 1e8, direction: 'out', type: 'native' });
      }
    } else if (receivedHere > 0) {
      if (tx.vout.length >= 10) batchFundings++;
      if (receivedHere <= 1000) dustReceived++;
      const senders = [...new Set(inputs.map((p) => p.scriptpubkey_address).filter((a): a is string => !!a))];
      const from = senders[0] ?? (tx.vin.some((v) => v.is_coinbase) ? 'coinbase' : '');
      for (const s of senders) counterparties.add(s);
      transfers.push({ signature: tx.txid, timestamp: ts, from, to: address, amount: receivedHere / 1e8, direction: 'in', type: 'native' });
    }
  }

  const counterpartyLabels: CounterpartyLabel[] = [...counterparties].map((a) => {
    const label = knownBtcEntity(a);
    return label ? { address: a, label, entityType: 'cex' } : { address: a };
  });

  const balanceSats =
    info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum +
    info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum;
  const price = await btcUsdPrice();

  const bitcoin: BitcoinFacts = {
    addressType: ownType,
    receiveCount: info.chain_stats.funded_txo_count,
    spendCount: info.chain_stats.spent_txo_count,
    balanceSats,
    coInputAddresses: [...coInputs].slice(0, 50),
    coInputCount: coInputs.size,
    consolidations,
    batchFundings,
    roundPayments,
    outTxs,
    changeTypeMatches,
    mixedInputTypes,
    dustReceived,
    analyzedTxs: txs.length,
  };

  return {
    chain: 'bitcoin',
    nativeSymbol: 'BTC',
    address,
    transfers,
    balances: { sol: 0, native: balanceSats / 1e8, tokens: [], nfts: [], totalUsdValue: price != null ? (balanceSats / 1e8) * price : undefined },
    identity: knownBtcEntity(address) ? { name: knownBtcEntity(address), entityType: 'cex' } : null,
    fundedBy: null,
    counterpartyLabels,
    totalTransactions: info.chain_stats.tx_count + info.mempool_stats.tx_count,
    firstActivityTimestamp: firstTimestamp,
    programs: [],
    programFrequency: {},
    transactionSources: {},
    transactionTypes: {},
    bitcoin,
  };
}
