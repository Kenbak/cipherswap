import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

const REPO = 'https://github.com/Kenbak/cipherswap';
const SHA = process.env.NEXT_PUBLIC_BUILD_SHA || '';

const LINK = 'term !text-xs text-muted hover:text-primary transition-colors';

export function Footer() {
  return (
    <footer className="border-t border-cipher-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="CipherSwap home"><BrandLogo compact /></Link>
          <span className="term !text-xs text-muted">by Atmosphere Labs</span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/how-it-works" className={LINK}>How it works</Link>
          <Link href="/how-it-works#privacy" className={LINK}>Privacy</Link>
          <a href={REPO} target="_blank" rel="noopener noreferrer" className={LINK}>Source ↗</a>
          <span className="text-muted/40" aria-hidden>|</span>
          <a href="https://zecblock.com/" target="_blank" rel="noopener noreferrer" className={LINK}>ZecBlock ↗</a>
          <a href="https://cipherpay.app" target="_blank" rel="noopener noreferrer" className={LINK}>CipherPay ↗</a>
          <a href="https://x.com/zecblock" target="_blank" rel="noopener noreferrer" className={LINK}>X ↗</a>
        </nav>

        {SHA ? (
          <a href={`${REPO}/commit/${SHA}`} target="_blank" rel="noopener noreferrer" className={LINK} title="Commit this deployment was built from">
            build {SHA.slice(0, 7)}
          </a>
        ) : null}
      </div>
    </footer>
  );
}
