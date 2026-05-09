'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useZecPrice } from '@/app/_components/ZecPriceContext';

export function Navbar() {
  const { price, change24h } = useZecPrice();

  return (
    <header className="border-b border-glass-4 sticky top-0 z-50" style={{ backgroundColor: 'rgba(20, 22, 31, 0.9)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="CipherSwap Logo"
            width={22}
            height={22}
            unoptimized
            priority
            style={{ width: 22, height: 22 }}
            className="group-hover:scale-105 transition-transform"
          />
          <span className="text-sm font-bold font-mono tracking-wide">
            <span className="text-cipher-cyan">Cipher</span>
            <span className="text-primary">Swap</span>
          </span>
        </Link>

        {price != null && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-muted">ZEC</span>
            <span className="text-primary">${price.toFixed(2)}</span>
            {change24h != null && (
              <span className={change24h >= 0 ? 'text-cipher-green' : 'text-cipher-orange'}>
                [{change24h >= 0 ? '\u2191' : '\u2193'}{Math.abs(change24h).toFixed(1)}%]
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
