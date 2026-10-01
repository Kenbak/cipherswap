import type { Metadata } from 'next';
import { Suspense } from 'react';
import ExposureClient from './ExposureClient';

export const metadata: Metadata = {
  title: 'Wallet Traceability Audit | CipherSwap',
  description:
    'Audit what your Solana, Bitcoin or Ethereum wallet reveals about you: timezone, linked addresses, ENS names, exchange links and more. Then move to shielded Zcash.',
  openGraph: {
    title: 'Wallet Traceability Audit | CipherSwap',
    description:
      'See what the blockchain reveals about your Solana, Bitcoin or Ethereum wallet, then move to shielded Zcash.',
    siteName: 'CipherSwap',
    type: 'website',
    url: 'https://cipherswap.app/exposure',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wallet Traceability Audit',
    description:
      '15 heuristics reveal what the blockchain says about you. Audit your wallet, then encrypt it.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://cipherswap.app/exposure' },
};

export default function ExposurePage() {
  return (
    <section className="min-h-[calc(100dvh-var(--nav-height))] flex items-start justify-center pt-10 pb-16">
      <Suspense fallback={
        <div className="w-full max-w-2xl mx-auto px-4 pt-8 text-center">
          <div className="card p-8">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-cipher-gold/30 border-t-cipher-gold animate-spin" />
          </div>
        </div>
      }>
        <ExposureClient />
      </Suspense>
    </section>
  );
}
