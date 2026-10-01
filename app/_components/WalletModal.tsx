'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DetectedWallet, UseWalletReturn } from '@/hooks/useWallet';
import { chainToWalletType } from '@/hooks/useWallet';
import { getLastWallet } from '@/lib/swap-history';
import { shortAddress } from '@/lib/deposit';
import { Modal, Spinner, CopyButton } from './ui';

type WalletFamily = NonNullable<DetectedWallet['type']>;

const FAMILY_LABEL: Record<WalletFamily, string> = {
  evm: 'Ethereum & EVM chains',
  solana: 'Solana',
  bitcoin: 'Bitcoin',
  tron: 'Tron',
};

const FAMILY_ORDER: WalletFamily[] = ['evm', 'solana', 'bitcoin', 'tron'];

export function WalletIcon({ wallet: w, size = 24 }: { wallet: DetectedWallet; size?: number }) {
  const fallback: Record<string, string> = {
    evm: '/chains/eth.png', solana: '/chains/sol.png', bitcoin: '/chains/btc.png', tron: '/chains/tron.png',
  };
  const src = w.icon || fallback[w.type || ''];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="rounded-lg shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-lg bg-glass-8 flex items-center justify-center text-primary font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {w.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function WalletModal({
  open,
  onClose,
  wallet,
  chain,
  chainLabel,
  onConnect,
  onChooseManual,
  error,
}: {
  open: boolean;
  onClose: () => void;
  wallet: UseWalletReturn;
  chain: string;
  chainLabel: string;
  onConnect: (w: DetectedWallet) => void;
  onChooseManual: () => void;
  error: string;
}) {
  const needed = chainToWalletType(chain);
  const lastUsed = open ? getLastWallet() : null;

  const groups = useMemo(() => {
    const byFamily = new Map<WalletFamily, DetectedWallet[]>();
    for (const w of wallet.allWallets) {
      if (!w.type) continue;
      const list = byFamily.get(w.type) ?? [];
      list.push(w);
      byFamily.set(w.type, list);
    }
    const order = [...FAMILY_ORDER].sort((a, b) => (a === needed ? -1 : b === needed ? 1 : 0));
    return order
      .filter((f) => byFamily.has(f))
      .map((f) => ({
        family: f,
        wallets: [...byFamily.get(f)!].sort((a, b) => (a.name === lastUsed ? -1 : b.name === lastUsed ? 1 : 0)),
      }));
  }, [wallet.allWallets, needed, lastUsed]);

  const noWallets = wallet.allWallets.length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Connect a wallet">
      <div className="space-y-4">
        {needed ? (
          <p className="px-2 text-sm text-secondary">
            You&apos;re sending from <span className="text-primary">{chainLabel}</span>. Wallets that can sign
            for it are listed first.
          </p>
        ) : (
          <p className="px-2 text-sm text-secondary">
            CipherSwap can&apos;t sign {chainLabel} transactions from a browser wallet yet. Send manually instead.
          </p>
        )}

        {noWallets && (
          <div className="mx-2 panel px-4 py-5 text-center">
            <p className="text-sm text-primary">No browser wallet detected</p>
            <p className="mt-1 text-xs text-muted">
              Install one (MetaMask, Rabby, Phantom, TronLink…) or send from any wallet or exchange.
            </p>
          </div>
        )}

        {groups.map(({ family, wallets }) => {
          const compatible = !needed || family === needed;
          return (
            <section key={family} aria-label={FAMILY_LABEL[family]}>
              <div className="px-2 pb-1.5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted">{FAMILY_LABEL[family]}</h3>
                {family === needed && <span className="text-xs text-cipher-gold">Matches {chainLabel}</span>}
              </div>
              <div className="space-y-1">
                {wallets.map((w) => (
                  <button
                    key={`${w.providerKey}-${w.type}`}
                    type="button"
                    disabled={wallet.switching}
                    onClick={() => onConnect(w)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-50 ${
                      compatible ? 'hover:bg-glass-6' : 'opacity-60 hover:opacity-100 hover:bg-glass-4'
                    }`}
                  >
                    <WalletIcon wallet={w} size={32} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-primary truncate">{w.name}</span>
                    {w.name === lastUsed && <span className="chip !py-0 !text-[0.6875rem]">Last used</span>}
                    {wallet.switching && <Spinner className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {error && (
          <p role="alert" className="mx-2 px-3 py-2 rounded-lg bg-danger/[0.06] border border-danger/20 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mx-2 pt-3 border-t border-glass-4">
          <button
            type="button"
            onClick={onChooseManual}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-glass-6 transition-colors text-left"
          >
            <span>
              <span className="block text-sm font-medium text-primary">Send manually</span>
              <span className="block text-xs text-muted">From an exchange or any wallet. No connection needed.</span>
            </span>
            <span className="text-muted" aria-hidden>→</span>
          </button>
        </div>

        <p className="px-2 text-xs text-muted leading-relaxed">
          Connecting only shares your public address with this page, to read your balance and fill the refund
          address. CipherSwap never asks for keys or seed phrases.
        </p>
      </div>
    </Modal>
  );
}

export function WalletButton({
  wallet,
  onOpen,
  onDisconnect,
}: {
  wallet: UseWalletReturn;
  onOpen: () => void;
  onDisconnect: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  if (!wallet.connected || !wallet.address) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={wallet.switching}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-cipher-gold bg-cipher-gold/10 hover:bg-cipher-gold/15 transition-colors disabled:opacity-50"
      >
        {wallet.switching ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        aria-expanded={menu}
        className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-md bg-glass-4 hover:bg-glass-8 transition-colors"
      >
        <span className="w-1.5 h-1.5 bg-cipher-green" aria-hidden />
        <span className="text-sm text-secondary hidden sm:inline">{wallet.walletName}</span>
        <span className="term text-primary">{shortAddress(wallet.address, 4, 4)}</span>
      </button>
      {menu && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 swap-card !rounded-2xl p-2 animate-fade-in">
          <div className="px-2.5 py-2 flex items-center justify-between gap-2">
            <span className="term text-secondary truncate">{shortAddress(wallet.address, 8, 6)}</span>
            <CopyButton value={wallet.address} label="Copy address" compact />
          </div>
          <button
            type="button"
            onClick={() => { setMenu(false); onOpen(); }}
            className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-secondary hover:text-primary hover:bg-glass-6 transition-colors"
          >
            Switch wallet
          </button>
          <button
            type="button"
            onClick={() => { setMenu(false); onDisconnect(); }}
            className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
