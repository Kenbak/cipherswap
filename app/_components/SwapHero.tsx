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

/** Short centered title above the swap card. The card itself is the page's focus. */
export function SwapHeadline() {
  return (
    <header className="text-center min-w-0">
      <h1 className="font-medium text-primary tracking-[-0.035em] leading-[1.05] text-[2rem] sm:text-[2.75rem] text-balance">
        Buy <span className="text-cipher-gold">ZEC</span> from any chain.
      </h1>
      <p className="mt-3 text-[0.9375rem] sm:text-base text-secondary">Swap from 15+ chains into shielded Zcash.</p>
    </header>
  );
}

/** Quiet facts under the swap card: claims, network stats and a link to the explainer. */
export function SwapFacts({ stats }: { stats: NetworkStats | null }) {
  return (
    <footer className="text-center min-w-0 space-y-4">
      <p className="text-sm text-muted flex flex-wrap justify-center gap-x-2">
        {CLAIMS.map((c, i) => (
          <span key={c} className="whitespace-nowrap">
            {c}
            {i < CLAIMS.length - 1 && <span aria-hidden className="ml-2">·</span>}
          </span>
        ))}
      </p>

      {stats && (
        <a
          href="https://zecblock.com/crosschain"
          target="_blank"
          rel="noopener noreferrer"
          title="All ZEC cross-chain swaps through NEAR Intents, not only CipherSwap. Data from ZecBlock."
          className="term inline-flex flex-wrap justify-center gap-x-4 gap-y-1 text-muted hover:text-secondary transition-colors"
        >
          <span>{compactUsd(stats.volume24h)} 24h volume</span>
          <span aria-hidden>·</span>
          <span>{stats.swaps24h.toLocaleString('en-US')} swaps in 24h</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">via NEAR Intents ↗</span>
        </a>
      )}

      <div className="flex justify-center gap-5 text-sm">
        <Link href="/how-it-works" className="text-secondary hover:text-primary transition-colors">
          How it works
        </Link>
        <Link href="/how-it-works#privacy" className="text-secondary hover:text-primary transition-colors">
          What we know about you
        </Link>
      </div>
    </footer>
  );
}
