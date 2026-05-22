'use client';

import { useMemo } from 'react';
import type { DetectedWallet, UseWalletReturn } from '@/hooks/useWallet';
import { WalletIcon } from '../WalletSwitcher';

interface ConnectProps {
  wallet: UseWalletReturn;
  onChooseWallet: (w: DetectedWallet) => void;
  onChooseManual: () => void;
  walletError: string;
}

const CHAIN_CONNECT_LABEL: Record<string, string> = {
  evm: 'Ethereum & L2s',
  solana: 'Solana',
  tron: 'Tron',
  bitcoin: 'Bitcoin',
};

const CHAIN_BADGE: Record<string, string> = {
  evm: 'EVM',
  solana: 'SOL',
  tron: 'TRX',
  bitcoin: 'BTC',
};

const TYPE_ORDER: Record<string, number> = { evm: 0, solana: 1, tron: 2, bitcoin: 3 };

const WALLET_PRIORITY = [
  'Rabby Wallet',
  'Rabby',
  'MetaMask',
  'Phantom',
  'Coinbase Wallet',
  'Brave Wallet',
  'TronLink',
  'Solflare',
  'Trust Wallet',
];

const RECOMMENDED_WALLETS = new Set(['Rabby Wallet', 'Rabby']);

function groupByName(wallets: DetectedWallet[]): { name: string; options: DetectedWallet[] }[] {
  const map = new Map<string, DetectedWallet[]>();
  for (const w of wallets) {
    const arr = map.get(w.name) || [];
    arr.push(w);
    map.set(w.name, arr);
  }

  return Array.from(map.entries())
    .map(([name, options]) => ({
      name,
      options: [...options].sort(
        (a, b) => (TYPE_ORDER[a.type || ''] ?? 9) - (TYPE_ORDER[b.type || ''] ?? 9),
      ),
    }))
    .sort((a, b) => {
      const ai = WALLET_PRIORITY.indexOf(a.name);
      const bi = WALLET_PRIORITY.indexOf(b.name);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
}

const chainPillClass =
  'px-2 py-1 rounded text-[10px] font-mono font-medium border border-[var(--color-border-subtle)] bg-[var(--color-input)] text-secondary hover:border-cipher-cyan/40 hover:text-primary transition-colors disabled:opacity-50';

function WalletGroupRow({
  name,
  options,
  switching,
  onConnect,
}: {
  name: string;
  options: DetectedWallet[];
  switching: boolean;
  onConnect: (w: DetectedWallet) => void;
}) {
  const multi = options.length > 1;
  const primary = options[0];
  const recommended = !multi && RECOMMENDED_WALLETS.has(name);

  if (multi) {
    return (
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg surface-inset"
        role="group"
        aria-label={`${name} — choose network`}
      >
        <WalletIcon wallet={primary} size={20} />
        <span className="flex-1 min-w-0 text-sm font-sans font-medium text-primary truncate">
          {name}
        </span>
        <div className="flex gap-1 shrink-0">
          {options.map((w) => (
            <button
              key={`${w.providerKey}-${w.type}`}
              type="button"
              disabled={switching}
              title={CHAIN_CONNECT_LABEL[w.type || ''] || w.type || ''}
              onClick={() => onConnect(w)}
              className={chainPillClass}
            >
              {CHAIN_BADGE[w.type || ''] || w.type}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={switching}
      onClick={() => onConnect(primary)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg surface-inset hover:border-cipher-cyan/30 transition-colors disabled:opacity-50 text-left"
    >
      <WalletIcon wallet={primary} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-sans font-medium text-primary">{name}</span>
          {recommended && (
            <span className="text-[9px] font-mono uppercase tracking-wide px-1 py-0.5 rounded bg-cipher-cyan/10 text-cipher-cyan border border-cipher-cyan/25">
              Popular
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] font-mono text-muted shrink-0">
        {CHAIN_BADGE[primary.type || '']}
      </span>
    </button>
  );
}

export function Connect({
  wallet, onChooseWallet, onChooseManual, walletError,
}: ConnectProps) {
  const groups = useMemo(() => groupByName(wallet.allWallets), [wallet.allWallets]);

  return (
    <div className="space-y-3 py-0.5 animate-fade-in">
      <p className="text-xs font-sans text-secondary leading-snug">
        Pick a wallet — multi-chain brands show network buttons on the right.
      </p>

      {wallet.allWallets.length > 0 ? (
        <div className="space-y-1.5">
          {groups.map(({ name, options }) => (
            <WalletGroupRow
              key={name}
              name={name}
              options={options}
              switching={wallet.switching}
              onConnect={onChooseWallet}
            />
          ))}
        </div>
      ) : (
        <div className="surface-inset rounded-lg py-6 text-center">
          <div className="w-5 h-5 mx-auto mb-2 rounded-full border-2 border-glass-12 border-t-cipher-cyan animate-spin" />
          <p className="text-xs font-sans text-muted">Detecting wallets…</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
        <span className="text-[10px] font-mono text-muted/60 uppercase">or</span>
        <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
      </div>

      <button
        type="button"
        onClick={onChooseManual}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg surface-inset hover:border-cipher-cyan/25 transition-colors group text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[var(--color-input)] flex items-center justify-center shrink-0 border border-[var(--color-border-subtle)]">
            <svg className="w-3.5 h-3.5 text-muted group-hover:text-cipher-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-sans font-medium text-primary group-hover:text-cipher-cyan transition-colors">
              Send manually
            </div>
            <div className="text-[10px] font-sans text-muted">From an exchange</div>
          </div>
        </div>
        <svg className="w-4 h-4 text-muted/40 group-hover:text-cipher-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {wallet.allWallets.length === 0 && (
        <p className="text-[11px] font-sans text-muted">
          Install MetaMask, Phantom, or TronLink — or send manually.
        </p>
      )}

      {walletError && (
        <div className="px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-xs font-mono text-red-400">
          {walletError}
        </div>
      )}
    </div>
  );
}
