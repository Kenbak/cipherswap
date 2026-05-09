'use client';

import { useState, useRef, useEffect } from 'react';
import type { UseWalletReturn, DetectedWallet } from '@/hooks/useWallet';

function WalletIcon({ wallet: w, size = 24 }: { wallet: DetectedWallet; size?: number }) {
  if (w.icon) {
    return <img src={w.icon} alt="" className="rounded-full" style={{ width: size, height: size }} />;
  }
  const chainFallback: Record<string, string> = {
    evm: '/chains/eth.png', solana: '/chains/sol.png', bitcoin: '/chains/btc.png', tron: '/chains/tron.png',
  };
  const fallback = chainFallback[w.type || ''];
  if (fallback) {
    return <img src={fallback} alt="" className="rounded-full" style={{ width: size, height: size }} />;
  }
  return (
    <div className="bg-gray-500 rounded-full flex items-center justify-center text-white font-bold"
         style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {w.name.charAt(0).toUpperCase()}
    </div>
  );
}

interface WalletSwitcherProps {
  wallet: UseWalletReturn;
  chainWallets: DetectedWallet[];
  selectedChainLabel: string;
  onConnect: (w: DetectedWallet) => void;
  onDisconnect: () => void;
}

export function WalletSwitcher({ wallet, chainWallets, selectedChainLabel, onConnect, onDisconnect }: WalletSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={wallet.switching}
        aria-label={wallet.connected ? `Connected as ${wallet.walletName}` : 'Connect wallet'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all disabled:opacity-40 ${
          wallet.connected
            ? 'bg-cipher-green/8 hover:bg-glass-6 text-secondary'
            : chainWallets.length === 0
              ? 'text-muted hover:text-muted/80'
              : 'text-muted hover:text-cipher-cyan'
        }`}
      >
        {wallet.connected ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-cipher-green" />
            <span className="hidden sm:inline">{wallet.walletName} · {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
            <span className="sm:hidden">{wallet.address?.slice(0, 4)}...{wallet.address?.slice(-4)}</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{wallet.switching ? 'Connecting...' : chainWallets.length === 0 ? `No ${selectedChainLabel} wallet` : 'Connect'}</span>
          </>
        )}
      </button>

      {open && chainWallets.length > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-lg bg-[var(--color-surface-solid)] border border-glass-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in">
          <div className="px-3 py-2.5 border-b border-glass-4 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Select wallet</span>
            {wallet.connected && (
              <button
                onClick={() => { onDisconnect(); setOpen(false); }}
                className="text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
          {chainWallets.map((w) => (
            <button
              key={w.providerKey}
              onClick={() => { onConnect(w); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${
                wallet.connected && wallet.walletName === w.name
                  ? 'bg-glass-6'
                  : 'hover:bg-glass-4'
              }`}
            >
              <WalletIcon wallet={w} size={24} />
              <div className="flex-1">
                <div className="text-sm font-mono text-primary">{w.name}</div>
                <div className="text-[11px] font-mono text-muted capitalize">{w.type}</div>
              </div>
              {wallet.connected && wallet.walletName === w.name && (
                <span className="w-1.5 h-1.5 rounded-full bg-cipher-green shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && chainWallets.length === 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[260px] rounded-lg bg-[var(--color-surface-solid)] border border-glass-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-glass-4">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider">No {selectedChainLabel} wallet</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <p className="text-xs font-mono text-secondary leading-relaxed">
              <span className="text-primary font-medium">No wallet needed.</span>{' '}
              Fill in the form and you&apos;ll get a deposit address to send funds manually.
            </p>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-lg text-[11px] font-mono text-cipher-cyan bg-cipher-cyan/8 hover:bg-cipher-cyan/12 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { WalletIcon };
