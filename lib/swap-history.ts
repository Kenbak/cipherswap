'use client';

import type { QuoteResponse, SwapStatus } from './near-intents';

/**
 * Swaps are kept only in this browser so a user can return to a tracker.
 * Nothing here is sent to a CipherSwap server.
 */

export interface SwapLogEntry {
  at: number;
  code: string;
  detail?: string;
}

export interface SwapRecord {
  depositAddress: string;
  depositMemo?: string;
  createdAt: number;
  mode: 'wallet' | 'manual';
  token: string;
  chain: string;
  chainLabel: string;
  assetId: string;
  decimals: number;
  contractAddress?: string;
  amount: string;
  zecAddress: string;
  refundAddress: string;
  estimatedZec: string;
  txHash?: string;
  lastStatus?: SwapStatus;
  quoteResponse?: QuoteResponse;
  log: SwapLogEntry[];
}

const KEY = 'cipherswap_swaps_v1';
const LEGACY_KEY = 'cipherswap_pending_swap';
const LAST_WALLET_KEY = 'cipherswap_last_wallet';
const MAX_RECORDS = 10;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const SWAP_HISTORY_EVENT = 'cipherswap:history';

function read(): SwapRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: SwapRecord[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return list.filter((r) => r && r.depositAddress && r.createdAt > cutoff);
  } catch (err) {
    console.error('[swap-history] Unreadable history, resetting:', err);
    localStorage.removeItem(KEY);
    return [];
  }
}

function write(list: SwapRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
  window.dispatchEvent(new Event(SWAP_HISTORY_EVENT));
}

/** Imports the single pending swap stored by the previous UI, then drops the old key. */
function migrateLegacy() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  localStorage.removeItem(LEGACY_KEY);
  try {
    const p = JSON.parse(raw);
    if (!p?.depositAddress || read().some((r) => r.depositAddress === p.depositAddress)) return;
    write([
      {
        depositAddress: p.depositAddress,
        createdAt: p.createdAt || Date.now(),
        mode: p.txHash ? 'wallet' : 'manual',
        token: p.token,
        chain: p.chain,
        chainLabel: p.chainLabel,
        assetId: p.assetId,
        decimals: p.decimals,
        contractAddress: p.contractAddress,
        amount: p.amount,
        zecAddress: p.zecAddress,
        refundAddress: '',
        estimatedZec: p.estimatedZec,
        txHash: p.txHash,
        log: [],
      },
      ...read(),
    ]);
  } catch (err) {
    console.error('[swap-history] Could not migrate legacy pending swap:', err);
  }
}

export function listSwaps(): SwapRecord[] {
  if (typeof window === 'undefined') return [];
  migrateLegacy();
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function getSwap(depositAddress: string): SwapRecord | undefined {
  return listSwaps().find((r) => r.depositAddress === depositAddress);
}

export function saveSwap(record: SwapRecord) {
  const rest = read().filter((r) => r.depositAddress !== record.depositAddress);
  write([record, ...rest]);
}

export function updateSwap(depositAddress: string, patch: Partial<SwapRecord>) {
  const list = read();
  const idx = list.findIndex((r) => r.depositAddress === depositAddress);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  write(list);
}

export function appendLog(depositAddress: string, entry: SwapLogEntry) {
  const record = read().find((r) => r.depositAddress === depositAddress);
  if (!record) return;
  const last = record.log[record.log.length - 1];
  if (last && last.code === entry.code && last.detail === entry.detail) return;
  updateSwap(depositAddress, { log: [...record.log, entry] });
}

export function removeSwap(depositAddress: string) {
  write(read().filter((r) => r.depositAddress !== depositAddress));
}

export function getLastWallet(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_WALLET_KEY);
}

export function setLastWallet(name: string) {
  localStorage.setItem(LAST_WALLET_KEY, name);
}

/** Removes everything CipherSwap keeps in this browser. */
export function wipeLocalData() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(LAST_WALLET_KEY);
  window.dispatchEvent(new Event(SWAP_HISTORY_EVENT));
}

export function localDataSummary(): { swaps: number; hasLastWallet: boolean } {
  return { swaps: listSwaps().length, hasLastWallet: !!getLastWallet() };
}
