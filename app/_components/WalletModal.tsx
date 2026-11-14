'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DetectedWallet, UseWalletReturn } from '@/hooks/useWallet';
import { chainToWalletType } from '@/hooks/useWallet';
import { getLastWallet } from '@/lib/swap-history';
import { shortAddress } from '@/lib/deposit';
import { getChainIcon } from '@/components/TokenChainIcon';
import { Modal, Spinner, CopyButton } from './ui';

type WalletFamily = NonNullable<DetectedWallet['type']>;

const FAMILY_LABEL: Record<WalletFamily, string> = {
  evm: 'Ethereum & EVM chains',
  solana: 'Solana',
  bitcoin: 'Bitcoin',
  tron: 'Tron',
};

type WalletGroup = { family: WalletFamily; wallets: DetectedWallet[]; isLast: (w: DetectedWallet) => boolean };

const FAMILY_ORDER: WalletFamily[] = ['evm', 'solana', 'bitcoin', 'tron'];

/** Chain logos shown next to each wallet family. EVM lists a few of the chains it covers. */
const FAMILY_CHAINS: Record<WalletFamily, string[]> = {
  evm: ['eth', 'base', 'arb', 'bsc'],
  solana: ['sol'],
  bitcoin: ['btc'],
  tron: ['tron'],
};

const FAMILY_FALLBACK_ICON: Record<WalletFamily, string> = {
  evm: '/chains/eth.png', solana: '/chains/sol.png', bitcoin: '/chains/btc.png', tron: '/chains/tron.png',
};

function ChainStack({ family, size = 16 }: { family: WalletFamily; size?: number }) {
  return (
    <span className="flex items-center" aria-hidden>
      {FAMILY_CHAINS[family].map((c, i) => {
        const src = getChainIcon(c);
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c}
            src={src}
            alt=""
            className="rounded-full ring-2 ring-[var(--color-surface-solid)]"
            style={{ width: size, height: size, marginLeft: i ? -size * 0.3 : 0 }}
          />
        ) : null;
      })}
    </span>
  );
}

/** Wallet logo with a small badge for the chain family it signs for, so Phantom (EVM) and Phantom (Solana) read differently. */
export function WalletIcon({ wallet: w, size = 24, badge = true }: { wallet: DetectedWallet; size?: number; badge?: boolean }) {
  const family = w.type as WalletFamily | null;
  const src = w.icon || (family ? FAMILY_FALLBACK_ICON[family] : undefined);
  const badgeSrc = family ? getChainIcon(FAMILY_CHAINS[family][0]) : null;
  const badgeSize = Math.max(10, Math.round(size * 0.42));
  const showBadge = badge && badgeSrc && src !== badgeSrc;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="rounded-lg" style={{ width: size, height: size }} />
      ) : (
        <span
          className="rounded-lg bg-glass-8 flex items-center justify-center text-primary font-semibold"
          style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
          {w.name.charAt(0).toUpperCase()}
        </span>
      )}
      {showBadge && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={badgeSrc}
          alt=""
          className="absolute rounded-full ring-2 ring-[var(--color-surface-solid)]"
          style={{ width: badgeSize, height: badgeSize, right: -3, bottom: -3 }}
        />
      )}
    </span>
  );
}

function WalletRow({
  w, lastUsed, disabled, switching, onConnect,
}: {
  w: DetectedWallet; lastUsed: boolean; disabled: boolean; switching: boolean; onConnect: (w: DetectedWallet) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onConnect(w)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-glass-6 disabled:opacity-50"
    >
      <WalletIcon wallet={w} size={32} />
      <span className="flex-1 min-w-0 text-sm font-medium text-primary truncate">{w.name}</span>
      {lastUsed && <span className="text-[0.6875rem] text-muted">Last used</span>}
      {switching && <Spinner className="w-3.5 h-3.5" />}
    </button>
  );
}

function OtherNetworks({
  groups,
  renderGroup,
}: {
  groups: WalletGroup[];
  renderGroup: (g: WalletGroup) => ReactNode;
}) {
  // Lives inside the modal, which unmounts on close, so it starts collapsed every time.
  const [open, setOpen] = useState(false);
  const count = groups.reduce((n, g) => n + g.wallets.length, 0);
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-colors"
      >
        <span>Other networks · {count} wallet{count === 1 ? '' : 's'}</span>
        <span className="flex items-center gap-2">
          {!open && groups.map((g) => <ChainStack key={g.family} family={g.family} size={14} />)}
          <span aria-hidden className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        </span>
      </button>
      {open && (
        <>
          <p className="px-3 -mt-2 text-xs text-muted">Connecting one switches the token you send to that network.</p>
          {groups.map(renderGroup)}
        </>
      )}
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
  const last = open ? getLastWallet() : null;
  const lastName = last?.name ?? null;
  const lastType = (last?.type ?? null) as WalletFamily | null;
  const groups = useMemo(() => {
    const byFamily = new Map<WalletFamily, DetectedWallet[]>();
    for (const w of wallet.allWallets) {
      if (!w.type) continue;
      const list = byFamily.get(w.type) ?? [];
      list.push(w);
      byFamily.set(w.type, list);
    }
    // Older saves have no chain type; credit the name to the family being sent from, else the first one listing it.
    const lastFamily = lastName
      ? lastType
        ?? (needed && byFamily.get(needed)?.some((w) => w.name === lastName) ? needed : null)
        ?? FAMILY_ORDER.find((f) => byFamily.get(f)?.some((w) => w.name === lastName))
        ?? null
      : null;
    const isLast = (w: DetectedWallet) => !!lastName && w.name === lastName && w.type === lastFamily;
    const order = [...FAMILY_ORDER].sort((a, b) => (a === needed ? -1 : b === needed ? 1 : 0));
    return order
      .filter((f) => byFamily.has(f))
      .map((f) => ({
        family: f,
        wallets: [...byFamily.get(f)!].sort((a, b) => Number(isLast(b)) - Number(isLast(a))),
        isLast,
      }));
  }, [wallet.allWallets, needed, lastName, lastType]);

  const noWallets = wallet.allWallets.length === 0;
  const primary = needed ? groups.filter((g) => g.family === needed) : groups;
  const others = needed ? groups.filter((g) => g.family !== needed) : [];

  const renderGroup = ({ family, wallets, isLast }: WalletGroup) => (
    <section key={family} aria-label={FAMILY_LABEL[family]}>
      <div className="px-3 pb-1.5 flex items-center gap-2">
        <ChainStack family={family} size={14} />
        <h3 className="text-xs font-medium text-muted">{FAMILY_LABEL[family]}</h3>
      </div>
      <div className="space-y-0.5">
        {wallets.map((w) => (
          <WalletRow
            key={`${w.providerKey}-${w.type}`}
            w={w}
            lastUsed={isLast(w)}
            disabled={wallet.switching}
            switching={wallet.switching}
            onConnect={onConnect}
          />
        ))}
      </div>
    </section>
  );

  return (
    <Modal open={open} onClose={onClose} title="Connect a wallet">
      <div className="space-y-4">
        {needed ? (
          <p className="px-2 text-sm text-secondary">
            Sending from <span className="text-primary">{chainLabel}</span>. These wallets can sign it.
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

        {needed && !noWallets && primary.length === 0 && (
          <p className="mx-2 panel px-4 py-3 text-sm text-secondary">
            No {chainLabel} wallet detected in this browser. Send manually, or connect a wallet for another network
            and CipherSwap switches the token to match.
          </p>
        )}

        {primary.map(renderGroup)}

        {others.length > 0 && <OtherNetworks groups={others} renderGroup={renderGroup} />}

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

  const connectedWallet = wallet.allWallets.find((w) => w.name === wallet.walletName && w.type === wallet.walletType);

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
        {connectedWallet ? (
          <WalletIcon wallet={connectedWallet} size={18} />
        ) : (
          <span className="w-1.5 h-1.5 bg-cipher-green" aria-hidden />
        )}
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
