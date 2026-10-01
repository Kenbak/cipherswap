'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useZecPrice } from '@/app/_components/ZecPriceContext';
import { BrandLogo } from './BrandLogo';

const LINKS = [
  { href: '/', label: 'Swap' },
  { href: '/exposure', label: 'Audit' },
  { href: '/how-it-works', label: 'How it works' },
];

export function Navbar() {
  const pathname = usePathname();
  const { price, change24h } = useZecPrice();

  return (
    <header className="site-nav sticky top-0 z-50">
      <div className="max-w-6xl h-full mx-auto px-4 sm:px-6 flex items-center gap-3">
        <Link href="/" aria-label="CipherSwap home" className="shrink-0 mr-2 sm:mr-4">
          <BrandLogo />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-0.5 min-w-0 overflow-x-auto no-scrollbar">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' || pathname.startsWith('/swap') : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} className={`nav-link whitespace-nowrap ${l.href === '/how-it-works' ? 'hidden sm:inline-block' : ''}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        {price != null && (
          <div className="ml-auto flex items-center gap-1.5 term !text-[0.8125rem] shrink-0" title="ZEC price (CoinGecko)">
            <span className="w-2 h-2 bg-cipher-gold" aria-hidden />
            <span className="text-muted hidden sm:inline">ZEC</span>
            <span className="text-primary">${price.toFixed(2)}</span>
            {change24h != null && (
              <span className={change24h >= 0 ? 'text-cipher-green' : 'text-cipher-orange'}>
                {change24h >= 0 ? '+' : '−'}{Math.abs(change24h).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
