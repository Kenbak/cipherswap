'use client';

import type { DetectedWallet, UseWalletReturn } from '@/hooks/useWallet';
import { WalletIcon } from '../WalletSwitcher';

interface ConnectProps {
  wallet: UseWalletReturn;
  onChooseWallet: (w: DetectedWallet) => void;
  onChooseManual: () => void;
  walletError: string;
}

export function Connect({ wallet, onChooseWallet, onChooseManual, walletError }: ConnectProps) {
  const typeMap = new Map<string, DetectedWallet[]>();
  for (const w of wallet.allWallets) {
    if (!w.type) continue;
    const arr = typeMap.get(w.type) || [];
    arr.push(w);
    typeMap.set(w.type, arr);
  }
  const chainLabels: Record<string, string> = {
    evm: 'EVM Chains', solana: 'Solana', tron: 'Tron', bitcoin: 'Bitcoin',
  };

  return (
    <div className="space-y-5 py-1 animate-fade-in">
      {/* Wallet section */}
      <div>
        <h2 className="text-base font-mono font-semibold text-primary mb-1">Connect Wallet</h2>
        <p className="text-xs font-mono text-muted leading-relaxed mb-4">
          Auto-fill addresses, see balances, and send directly.
        </p>

        {wallet.allWallets.length > 0 ? (
          <div className="space-y-3">
            {Array.from(typeMap.entries()).map(([type, wallets]) => (
              <div key={type}>
                <div className="text-[10px] font-mono text-muted/60 uppercase tracking-wider mb-1.5">{chainLabels[type] || type}</div>
                <div className="flex flex-wrap gap-2">
                  {wallets.map(w => (
                    <button
                      key={w.providerKey}
                      onClick={() => onChooseWallet(w)}
                      disabled={wallet.switching}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-glass-3 border border-glass-6 hover:border-cipher-cyan/30 hover:bg-glass-4 transition-all disabled:opacity-50"
                    >
                      <WalletIcon wallet={w} size={20} />
                      <span className="text-xs font-mono text-primary">{w.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-5 h-5 mx-auto mb-2 rounded-full border-2 border-glass-12 border-t-cipher-cyan animate-spin" />
            <p className="text-xs text-muted font-mono">Detecting wallets...</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-glass-4" />
        <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-glass-4" />
      </div>

      {/* Manual mode row */}
      <button
        onClick={onChooseManual}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border border-glass-6 bg-glass-2 hover:border-cipher-cyan/20 hover:bg-glass-3 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-glass-4 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-muted group-hover:text-cipher-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-mono font-semibold text-primary group-hover:text-cipher-cyan transition-colors">
              Send Manually
            </div>
            <div className="text-[11px] font-mono text-muted leading-relaxed">
              Paste your sending address and copy the deposit address
            </div>
          </div>
        </div>
        <svg className="w-4 h-4 text-muted/40 group-hover:text-cipher-cyan transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {wallet.allWallets.length === 0 && (
        <div className="px-4 py-3 rounded-lg bg-glass-2 border border-glass-4">
          <p className="text-xs font-mono text-muted leading-relaxed">
            <span className="text-primary font-medium">No wallet detected.</span>{' '}
            Install a browser wallet like MetaMask, Phantom, or TronLink, or choose &ldquo;Send Manually&rdquo; above.
          </p>
        </div>
      )}

      {walletError && (
        <div className="px-4 py-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-xs font-mono text-red-400">
          {walletError}
        </div>
      )}
    </div>
  );
}
