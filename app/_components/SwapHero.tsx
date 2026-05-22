'use client';

import { useWallet } from '@/hooks/useWallet';

const TRUST_PILLS = [
  { label: 'Non-custodial swap', icon: '◇' },
  { label: 'No KYC on swap', icon: '○' },
  { label: 'Privacy-aware amounts', icon: '◆' },
] as const;

export function SwapHero() {
  const wallet = useWallet();
  const compact = wallet.connected;

  return (
    <div
      className={`animate-fade-in max-w-3xl transition-all duration-normal ${
        compact ? 'mb-5 sm:mb-6' : 'mb-8 sm:mb-10'
      }`}
    >
      <h1
        className={`font-bold font-sans text-primary tracking-tight leading-[1.05] transition-all duration-normal ${
          compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'
        }`}
      >
        Buy <span className="text-cipher-yellow font-mono">ZEC</span> from any chain.
      </h1>

      {compact ? (
        <p className="mt-2 text-sm font-sans text-secondary">
          Swap to ZEC with privacy-aware amount suggestions.
        </p>
      ) : (
        <>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base font-sans text-secondary leading-relaxed">
            Cross-chain swap from ETH, BTC, SOL and 15+ more. Privacy-aware, with
            amount suggestions that blend into shielded ZEC traffic.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-5">
            {TRUST_PILLS.map(({ label, icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans text-primary/85 border border-glass-8 bg-glass-3"
              >
                <span className="text-cipher-cyan/70 text-[10px]" aria-hidden>
                  {icon}
                </span>
                {label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-sans text-muted leading-relaxed max-w-2xl">
            Cross-chain swap is wallet-to-wallet via NEAR Intents, no account with us.
            Optional card top-up (MoonPay) is separate and may require ID verification.
          </p>
        </>
      )}
    </div>
  );
}
