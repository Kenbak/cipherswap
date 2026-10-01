import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LocalDataControls } from './LocalDataControls';

export const metadata: Metadata = {
  title: 'How it works — CipherSwap',
  description: 'How CipherSwap swaps any crypto into Zcash, who holds your funds, what happens if a swap fails, fees, and exactly what data we see.',
};

const REPO = 'https://github.com/Kenbak/cipherswap';
const SHA = process.env.NEXT_PUBLIC_BUILD_SHA || '';

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-t border-cipher-border first:border-0 first:pt-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-primary">{title}</h2>
      <div className="mt-4 space-y-3 text-[0.9375rem] text-secondary leading-relaxed">{children}</div>
    </section>
  );
}

function Ledger({ rows }: { rows: { who: string; sees: string }[] }) {
  return (
    <dl className="divide-y divide-[var(--color-border-subtle)] panel">
      {rows.map((r) => (
        <div key={r.who} className="grid sm:grid-cols-[11rem_1fr] gap-1 sm:gap-4 px-4 py-3">
          <dt className="term !text-[0.8125rem] text-primary">{r.who}</dt>
          <dd className="text-sm text-secondary leading-relaxed">{r.sees}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <header className="mb-10">
        <p className="eyebrow">how it works</p>
        <h1 className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-primary">Don&apos;t trust. Verify.</h1>
        <p className="mt-3 text-base text-secondary leading-relaxed">
          CipherSwap is a thin, open-source interface to NEAR Intents. This page explains where your funds go,
          what can go wrong, what it costs, and what anyone involved can see.
        </p>
      </header>

      <Section id="flow" eyebrow="flow" title="A swap in four steps">
        <ol className="space-y-3">
          {[
            ['Quote', 'You choose a token and amount. NEAR Intents solvers compete to quote how much ZEC you get. Previews are anonymous: no addresses are sent until you confirm.'],
            ['Deposit address', 'On confirm, NEAR Intents 1Click issues a one-time deposit address on your source chain and signs the quote. CipherSwap never holds funds.'],
            ['Deposit', 'You send exactly the quoted amount, from a connected wallet or manually from any wallet or exchange.'],
            ['Delivery', 'Once the deposit confirms, a solver fills the swap and ZEC is sent to your Zcash address. The tracker links every transaction.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="term !text-sm text-cipher-gold shrink-0 w-5">{i + 1}.</span>
              <span><span className="text-primary font-medium">{t}.</span> {d}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="custody" eyebrow="custody" title="Who holds your funds">
        <p>
          Between your deposit and delivery, funds are held by the NEAR Intents protocol, not by CipherSwap. Each
          deposit address is unique to your quote, and the quote is signed by the 1Click service. The tracker lets
          you download that signed quote. Keep it: it&apos;s your proof of the agreed terms.
        </p>
      </Section>

      <Section id="failures" eyebrow="failures" title="If something goes wrong">
        <ul className="space-y-2 list-none">
          <li><span className="text-primary">Price moves too far.</span> If a swap can&apos;t fill at or above your minimum (set by slippage), the deposit is refunded to your refund address.</li>
          <li><span className="text-primary">You send too little.</span> The swap waits as an incomplete deposit. Top up the difference to the same address before the deadline, or it&apos;s refunded.</li>
          <li><span className="text-primary">Deadline passes.</span> Deposit addresses expire (the tracker shows when). Never reuse an old deposit address.</li>
          <li><span className="text-primary">Memo chains.</span> Some chains require a deposit memo or tag. CipherSwap shows it prominently when needed; deposits without it can&apos;t be matched.</li>
          <li><span className="text-primary">You closed the tab.</span> Swaps are saved in this browser and every swap has its own tracking link. Nothing is lost if you leave.</li>
        </ul>
      </Section>

      <Section id="fees" eyebrow="fees" title="What it costs">
        <p>
          A 0.50% app fee is included in every quote. NEAR Intents splits it, and the review screen lists the exact
          recipients returned with your quote (currently 0.25% to <span className="term !text-sm text-primary">cipherscan.near</span>, which funds CipherSwap, and 0.25% to a second account set by 1Click).
          Solver spread and the ZEC network fee are also priced in. The review screen shows the total cost against
          market price before you confirm.
        </p>
      </Section>

      <Section id="privacy" eyebrow="privacy" title="What we know about you">
        <p>Honest accounting, including the parts that aren&apos;t private:</p>
        <Ledger
          rows={[
            { who: 'CipherSwap server', sees: 'Swap requests pass through our server to NEAR Intents, so their API sees our server, not your IP. We keep no accounts and no swap database. Our host (Vercel) sees your IP, as with any website.' },
            { who: 'Analytics', sees: 'Anonymous, cookieless page-view counts via Vercel Web Analytics. No cross-site tracking, no wallet addresses.' },
            { who: 'NEAR Intents / solvers', sees: 'Your amounts, deposit address, refund address and ZEC recipient: what they need to execute and refund the swap.' },
            { who: 'Public blockchains', sees: 'Your deposit on the source chain is public. ZEC sent to a transparent (t1) address is public. To a shielded address, the amount entering the pool is visible; later use is private.' },
            { who: 'Your browser', sees: 'Recent swaps (for tracking) and the last wallet name you used, kept in local storage for 7 days. Never sent anywhere.' },
            { who: 'Wallet connection', sees: 'Only your public address, used to read your balance and fill the refund address. Solana balance lookups are proxied through our server; EVM and Tron use your wallet’s own RPC. Leather (Bitcoin) balance lookups query mempool.space directly from your browser.' },
            { who: 'MoonPay (optional)', sees: 'If you buy crypto with a card, MoonPay runs ID checks (KYC) and sees what you give them. That path is clearly marked.' },
          ]}
        />
        <LocalDataControls />
      </Section>

      <Section id="verify" eyebrow="verify" title="Verify this build">
        <p>
          CipherSwap is open source. The footer of every page links to the commit this deployment was built from
          {SHA ? (
            <> (<a href={`${REPO}/commit/${SHA}`} target="_blank" rel="noopener noreferrer" className="term !text-sm text-cipher-gold hover:underline">{SHA.slice(0, 7)}</a>)</>
          ) : null}
          , so you can read exactly what runs. Every swap&apos;s tracker has a &quot;Verify this swap&quot; panel with the signed
          quote, raw status and links to each transaction on its own explorer.
        </p>
        <p>
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-cipher-gold hover:underline">Source on GitHub ↗</a>
          <span className="text-muted"> · </span>
          <Link href="/" className="text-cipher-gold hover:underline">Start a swap →</Link>
        </p>
      </Section>
    </div>
  );
}
