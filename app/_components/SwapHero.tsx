import Link from 'next/link';

export interface NetworkStats {
  volume24h: number;
  swaps24h: number;
  swapsAllTime: number;
}

const CLAIMS = ['Non-custodial', 'No account', 'Auto-refund', 'Open source'];

function compactUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
}

export function SwapHero({ stats }: { stats: NetworkStats | null }) {
  return (
    <div className="max-w-xl lg:pt-4">
      <p className="eyebrow">cross-chain → shielded zcash</p>
      <h1 className="mt-3 font-mono font-bold text-primary tracking-tight leading-[1.05] text-[2rem] sm:text-5xl">
        Buy <span className="text-cipher-gold">ZEC</span> from any chain.
      </h1>
      <p className="mt-4 text-base sm:text-lg text-secondary">Swap from 15+ chains into shielded Zcash.</p>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {CLAIMS.map((c) => (
          <li key={c} className="flex items-center gap-2 text-sm text-primary">
            <span className="w-1.5 h-1.5 bg-cipher-gold" aria-hidden />
            {c}
          </li>
        ))}
      </ul>
      <Link href="/how-it-works" className="mt-3 inline-block text-sm text-muted hover:text-primary transition-colors">
        How it works →
      </Link>

      {stats && (
        <dl className="mt-10 hidden sm:flex gap-x-10" title="All ZEC cross-chain swaps through NEAR Intents, not only CipherSwap">
          {[
            { k: '24h volume', v: compactUsd(stats.volume24h) },
            { k: '24h swaps', v: stats.swaps24h.toLocaleString('en-US') },
            { k: 'all-time', v: stats.swapsAllTime.toLocaleString('en-US') },
          ].map((s) => (
            <div key={s.k}>
              <dt className="term text-muted">{s.k}</dt>
              <dd className="term !text-lg text-primary">{s.v}</dd>
            </div>
          ))}
          <div className="self-end pb-1">
            <a href="https://zecblock.com/crosschain" target="_blank" rel="noopener noreferrer" className="term text-muted hover:text-primary">
              NEAR Intents · ZecBlock ↗
            </a>
          </div>
        </dl>
      )}
    </div>
  );
}
