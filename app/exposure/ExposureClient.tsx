'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from '@/hooks/useWallet';
import { scoreWallet } from '@/lib/exposure/scoring';
import { deriveInsights, dayName, formatHourUtc, shortAddr, type WalletInsights } from '@/lib/exposure/insights';
import { offsetToTimezoneLabel, offsetToRegions } from '@/lib/exposure/timezone';
import { GRADE_COLORS } from '@/lib/exposure/constants';
import { labelPrograms } from '@/lib/exposure/known-programs';
import { ZCASH_WALLETS } from '@/lib/exposure/zcash-wallets';
import { REMEDIATION } from '@/lib/exposure/remediation';
import { CopyButton, ExternalIcon } from '@/app/_components/ui';
import { BubbleGraph, type GraphNode } from './BubbleGraph';
import { parseExposureChain, type WalletScanData, type ExposureScore, type Finding, type Severity, type ExposureChain } from '@/lib/exposure/types';
import { isValidBitcoinAddress } from '@/lib/exposure/bitcoin-address';
import { isValidEthereumAddress } from '@/lib/exposure/ethereum-entities';

type ScanState = 'input' | 'scanning' | 'results' | 'error';

const motionProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 28 },
};

function isValidSolanaAddress(address: string): boolean {
  if (address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

const CHAIN_META: Record<ExposureChain, {
  label: string;
  icon: string;
  walletChain: string;
  walletType: 'solana' | 'bitcoin' | 'evm';
  placeholder: string;
  wallets: string;
  explorer: string;
  explorerUrl: (address: string) => string;
  validate: (address: string) => boolean;
  decimals: number;
}> = {
  solana: {
    label: 'Solana', icon: '/chains/sol.png', walletChain: 'sol', walletType: 'solana',
    placeholder: 'Paste a Solana address…', wallets: 'Phantom or Solflare',
    explorer: 'Orb Markets', explorerUrl: (a) => `https://orbmarkets.io/address/${a}`, validate: isValidSolanaAddress, decimals: 4,
  },
  bitcoin: {
    label: 'Bitcoin', icon: '/chains/btc.png', walletChain: 'btc', walletType: 'bitcoin',
    placeholder: 'Paste a Bitcoin address (bc1…, 1…, 3…)', wallets: 'Unisat, Xverse or Leather',
    explorer: 'mempool.space', explorerUrl: (a) => `https://mempool.space/address/${a}`, validate: isValidBitcoinAddress, decimals: 8,
  },
  ethereum: {
    label: 'Ethereum', icon: '/chains/eth.png', walletChain: 'eth', walletType: 'evm',
    placeholder: 'Paste an Ethereum address (0x…)', wallets: 'MetaMask, Rabby or Coinbase Wallet',
    explorer: 'Etherscan', explorerUrl: (a) => `https://etherscan.io/address/${a}`, validate: isValidEthereumAddress, decimals: 4,
  },
};

function isValidAddress(chain: ExposureChain, address: string): boolean {
  return CHAIN_META[chain].validate(address);
}

export function explorerAddressUrl(chain: ExposureChain, address: string): string {
  return CHAIN_META[chain].explorerUrl(address);
}

export default function ExposureClient() {
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const [state, setState] = useState<ScanState>('input');
  const [chain, setChain] = useState<ExposureChain>(() => parseExposureChain(searchParams.get('chain')));
  const [address, setAddress] = useState('');
  const [scanData, setScanData] = useState<WalletScanData | null>(null);
  const [score, setScore] = useState<ExposureScore | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    const addrParam = searchParams.get('address');
    const chainParam = parseExposureChain(searchParams.get('chain'));
    if (addrParam && isValidAddress(chainParam, addrParam) && state === 'input') {
      setAddress(addrParam);
      handleScan(addrParam, chainParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleScan = useCallback(async (addr: string, scanChain: ExposureChain) => {
    if (!isValidAddress(scanChain, addr)) {
      setErrorMessage(`That does not look like a valid ${CHAIN_META[scanChain].label} address.`);
      setState('error');
      return;
    }
    setChain(scanChain);

    setState('scanning');
    const startedAt = Date.now();

    try {
      const res = await fetch('/api/exposure/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, chain: scanChain }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scan failed');
      }

      const { data } = await res.json();
      const result = scoreWallet(data);

      const elapsed = Date.now() - startedAt;
      if (elapsed < 2600) await new Promise(r => setTimeout(r, 2600 - elapsed));

      setScanData(data);
      setScore(result);
      setState('results');

      const url = new URL(window.location.href);
      url.searchParams.set('address', addr);
      url.searchParams.set('chain', scanChain);
      window.history.replaceState({}, '', url.toString());
    } catch (err: any) {
      setErrorMessage(err.message || 'Scan failed. Please try again.');
      setState('error');
    }
  }, []);

  const handleReset = () => {
    setState('input');
    setAddress('');
    setScanData(null);
    setScore(null);
    setErrorMessage('');
    const url = new URL(window.location.href);
    url.searchParams.delete('address');
    url.searchParams.delete('chain');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className={`w-full mx-auto px-4 ${state === 'results' ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <AnimatePresence mode="wait">
        {state === 'input' && (
          <motion.div key="input" {...motionProps}>
            <InputView chain={chain} setChain={setChain} address={address} setAddress={setAddress} onScan={handleScan} wallet={wallet} />
          </motion.div>
        )}

        {state === 'scanning' && (
          <motion.div key="scanning" {...motionProps}>
            <ScanningView address={address} chain={chain} />
          </motion.div>
        )}

        {state === 'results' && score && scanData && (
          <motion.div key="results" {...motionProps}>
            <ResultsView
              score={score}
              data={scanData}
              onReset={handleReset}
              onEncrypt={() => setGateOpen(true)}
            />
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div key="error" {...motionProps}>
            <ErrorView message={errorMessage} onRetry={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gateOpen && <EncryptGate chain={chain} onClose={() => setGateOpen(false)} walletConnected={wallet.connected && wallet.walletType === CHAIN_META[chain].walletType} />}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────  INPUT  ───────────────────────── */

function InputView({
  chain,
  setChain,
  address,
  setAddress,
  onScan,
  wallet,
}: {
  chain: ExposureChain;
  setChain: (c: ExposureChain) => void;
  address: string;
  setAddress: (v: string) => void;
  onScan: (addr: string, chain: ExposureChain) => void;
  wallet: ReturnType<typeof useWallet>;
}) {
  const meta = CHAIN_META[chain];
  const valid = address.length === 0 || isValidAddress(chain, address);
  const [connectError, setConnectError] = useState('');
  const [awaitingConnect, setAwaitingConnect] = useState(false);

  const chainWallets = wallet.getWalletsForChain(meta.walletChain);

  const handleConnect = async () => {
    setConnectError('');
    if (wallet.connected && wallet.walletType === meta.walletType && wallet.address) {
      onScan(wallet.address, chain);
      return;
    }
    if (chainWallets.length === 0) {
      setConnectError(`No ${meta.label} wallet detected. Install ${meta.wallets}, or paste an address.`);
      return;
    }
    try {
      setAwaitingConnect(true);
      const ok = await wallet.connect(chainWallets[0]);
      if (!ok) setAwaitingConnect(false);
    } catch (e: any) {
      setAwaitingConnect(false);
      setConnectError(e?.message || 'Failed to connect wallet.');
    }
  };

  // Scan once the wallet the user just connected reports its address.
  useEffect(() => {
    if (awaitingConnect && wallet.connected && wallet.walletType === meta.walletType && wallet.address) {
      onScan(wallet.address, chain);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingConnect, wallet.connected, wallet.walletType, wallet.address]);

  const CHAINS = (['solana', 'bitcoin', 'ethereum'] as const).map(id => ({ id, label: CHAIN_META[id].label, icon: CHAIN_META[id].icon }));

  return (
    <div className="space-y-8 pt-6">
      <div className="text-center space-y-4">
        <p className="eyebrow">traceability audit</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-primary font-mono tracking-tight leading-[1.05]">
          What does your wallet <span className="text-cipher-gold">reveal?</span>
        </h1>
        <p className="text-secondary text-base sm:text-lg">See what anyone can learn from your {meta.label} address.</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 p-1 rounded-lg border border-cipher-border" role="tablist" aria-label="Chain">
          {CHAINS.map(c => {
            const selected = c.id === chain;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={selected}
                onClick={() => { setChain(c.id); setAddress(''); setConnectError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-colors ${
                  selected
                    ? 'bg-cipher-gold/12 text-cipher-gold border border-cipher-gold/30'
                    : 'text-secondary hover:text-primary hover:bg-cipher-hover border border-transparent'
                }`}
              >
                <img src={c.icon} alt="" width={16} height={16} className="rounded-full" />
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="swap-card p-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value.trim())}
            onKeyDown={e => e.key === 'Enter' && valid && address && onScan(address, chain)}
            placeholder={meta.placeholder}
            aria-label={`${meta.label} address`}
            spellCheck={false}
            className={`input-shell flex-1 px-4 py-3 font-mono text-sm bg-transparent text-primary placeholder:font-sans placeholder:text-muted focus:outline-none ${!valid ? '!border-danger/50' : ''}`}
          />
          <button
            onClick={() => onScan(address, chain)}
            disabled={!address || !valid}
            className="btn-primary sm:!w-auto px-8 whitespace-nowrap"
          >
            Run audit
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-cipher-border" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted">or</span>
          <div className="flex-1 h-px bg-cipher-border" />
        </div>

        <button onClick={handleConnect} disabled={wallet.switching} className="btn-secondary w-full !py-3">
          {wallet.switching ? 'Connecting…' : `Connect ${meta.label} wallet`}
        </button>
        {connectError && <p className="text-danger text-xs px-1">{connectError}</p>}
        {!valid && address && <p className="text-danger text-xs px-1">That isn&apos;t a valid {meta.label} address.</p>}
      </div>

      <p className="text-xs text-muted text-center">
        No account. Public chain data only, scored in your browser.{' '}
        <a href="/how-it-works#privacy" className="underline underline-offset-2 hover:text-primary">Details</a>
      </p>
    </div>
  );
}

/* ─────────────────────────  SCANNING  ───────────────────────── */

const SCAN_STAGES: Record<ExposureChain, string[]> = {
  solana: [
    'Fetching transaction history',
    'Decoding transfers & programs',
    'Mapping counterparty network',
    'Analyzing temporal patterns',
    'Inferring timezone from activity',
    'Fingerprinting app usage',
    'Computing exposure score',
  ],
  bitcoin: [
    'Fetching transaction history',
    'Decoding inputs & outputs',
    'Clustering co-spent addresses',
    'Detecting change outputs',
    'Analyzing temporal patterns',
    'Checking exchange-style payouts',
    'Computing exposure score',
  ],
  ethereum: [
    'Fetching transaction history',
    'Resolving ENS & public labels',
    'Tracing first funding source',
    'Probing exchange deposit addresses',
    'Reading tokens, NFTs & approvals',
    'Analyzing temporal patterns',
    'Computing exposure score',
  ],
};

function ScanningView({ address, chain }: { address: string; chain: ExposureChain }) {
  const stages = SCAN_STAGES[chain];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => Math.min(s + 1, stages.length - 1));
    }, 360);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card card-static p-8 mt-6">
      <div className="flex flex-col items-center gap-8">
        <Radar />

        <div className="w-full max-w-sm space-y-2">
          {stages.slice(0, stage + 1).map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3 text-sm font-mono"
            >
              {i < stage ? (
                <span className="text-cipher-green shrink-0">✓</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-cipher-gold animate-pulse shrink-0" />
              )}
              <span className={i < stage ? 'text-cipher-text-muted' : 'text-primary'}>
                {label}
                {i === stage && <span className="animate-pulse">…</span>}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] font-mono text-cipher-text-muted truncate max-w-xs">{address}</p>
      </div>
    </div>
  );
}

function Radar() {
  return (
    <div className="relative w-52 h-52">
      {[100, 68, 36].map(pct => (
        <div
          key={pct}
          className="absolute rounded-full border border-cipher-gold/15"
          style={{
            width: `${pct}%`,
            height: `${pct}%`,
            top: `${(100 - pct) / 2}%`,
            left: `${(100 - pct) / 2}%`,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-0 w-full h-px bg-cipher-gold/10" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-cipher-gold/10" />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(248,188,33,0) 0deg, rgba(248,188,33,0) 260deg, rgba(248,188,33,0.22) 340deg, rgba(248,188,33,0.55) 360deg)',
          maskImage: 'radial-gradient(circle, black 62%, transparent 63%)',
          WebkitMaskImage: 'radial-gradient(circle, black 62%, transparent 63%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
      />
      {[
        { top: '30%', left: '62%', delay: 0.2, color: 'bg-cipher-purple' },
        { top: '58%', left: '38%', delay: 0.8, color: 'bg-cipher-green' },
        { top: '46%', left: '70%', delay: 1.3, color: 'bg-cipher-gold' },
        { top: '68%', left: '58%', delay: 1.9, color: 'bg-cipher-orange' },
      ].map((b, i) => (
        <motion.span
          key={i}
          className={`absolute w-2 h-2 rounded-full ${b.color}`}
          style={{ top: b.top, left: b.left }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
          transition={{ duration: 1.8, delay: b.delay, repeat: Infinity, repeatDelay: 0.6 }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cipher-gold" />
    </div>
  );
}

/* ─────────────────────────  RESULTS  ───────────────────────── */

function ResultsView({
  score,
  data,
  onReset,
  onEncrypt,
}: {
  score: ExposureScore;
  data: WalletScanData;
  onReset: () => void;
  onEncrypt: () => void;
}) {
  const insights = deriveInsights(data);
  const tz = score.timezone && score.timezone.confidence >= 0.5 ? score.timezone : null;
  const accountAge = formatAccountAge(data.firstActivityTimestamp);
  const usd = data.balances.totalUsdValue ?? 0;
  const usdDisplay = usd >= 1_000_000
    ? usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
    : usd >= 1 ? usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : usd > 0 ? '<$1' : '$0';
  const native = data.balances.native;

  return (
    <div className="pt-2 pb-28 lg:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        {/* ── Left: the report, most important first ── */}
        <div className="space-y-4 order-2 lg:order-1 min-w-0">
          <FindingsCard findings={score.findings} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Public balance"
              value={usdDisplay}
              sub={native != null ? `${native.toLocaleString('en-US', { maximumFractionDigits: CHAIN_META[data.chain].decimals })} ${data.nativeSymbol}` : undefined}
            />
            <StatTile label="Transactions" value={data.totalTransactions.toLocaleString('en-US')} sub={accountAge ? `over ${accountAge}` : undefined} />
            <StatTile label="Counterparties" value={String(score.counterpartySummary.total)} sub={`${score.counterpartySummary.labeled} identified`} />
            {data.bitcoin ? (
              <StatTile label="Linked" value={String(data.bitcoin.coInputCount)} sub={data.bitcoin.coInputCount > 0 ? 'same-owner cluster' : 'none found'} />
            ) : (
              <StatTile label="Exchange links" value={String(score.counterpartySummary.exchanges)} sub={score.counterpartySummary.exchanges > 0 ? 'KYC risk' : 'none found'} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 min-w-0">
              <FavoritesCard insights={insights} data={data} />
            </div>
            <div className="lg:col-span-1">
              {tz ? <LocationCard timezone={tz} /> : <NoLocationCard enoughData={data.transfers.length >= 30} />}
            </div>
          </div>

          <ActivityHeatmap insights={insights} />

          {insights.exchangeLedger.length > 0 && <ExchangeLedgerCard insights={insights} />}

          <BehavioralProfile data={data} insights={insights} />

        </div>

        {/* ── Right: sticky summary + CTA (desktop) / top card (mobile) ── */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-20 space-y-3">
          <SummaryRail score={score} data={data} onReset={onReset} onEncrypt={onEncrypt} insights={insights} tz={tz} />
        </aside>
      </div>

      {/* Mobile pinned CTA */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 backdrop-blur border-t border-cipher-border"
        style={{ backgroundColor: 'rgb(11 12 14 / 0.92)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <GradePill grade={score.grade} score={score.score} />
          <button onClick={onEncrypt} className="btn-primary flex-1">
            Encrypt with Zcash →
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRail({
  score,
  data,
  onReset,
  onEncrypt,
  insights,
  tz,
}: {
  score: ExposureScore;
  data: WalletScanData;
  onReset: () => void;
  onEncrypt: () => void;
  insights: WalletInsights;
  tz: ExposureScore['timezone'];
}) {
  const gradeColor = GRADE_COLORS[score.grade] || '#EF4444';
  const verdict =
    score.score >= 85 ? 'Hard to trace'
    : score.score >= 50 ? 'Moderately exposed'
    : 'Highly traceable';

  const favApp = labelPrograms(data.programFrequency)[0]?.label;
  const shareParams = new URLSearchParams({
    chain: data.chain,
    grade: score.grade,
    score: String(score.score),
    verdict,
    ...(tz ? { tz: offsetToTimezoneLabel(tz.offset) } : {}),
    ...(favApp ? { app: favApp } : {}),
    ...(insights.favoriteHour ? { hour: formatHourUtc(insights.favoriteHour.hour) } : {}),
  });

  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>;
  for (const f of score.findings) counts[f.severity]++;
  const analyzed = data.analyzedTxs ?? data.bitcoin?.analyzedTxs;
  const partial = analyzed != null && analyzed < data.totalTransactions;

  return (
    <div className="card p-5">
      <div className="flex flex-col items-center text-center gap-3">
        <ScoreRing score={score.score} grade={score.grade} color={gradeColor} />
        <div>
          <p className="eyebrow">{data.chain} audit</p>
          <h2 className="text-xl font-mono font-bold text-primary mt-1.5">{verdict}</h2>
          <p className="mt-1 text-xs text-muted">
            {score.findings.length === 0
              ? 'No significant exposure found.'
              : `${score.findings.length} finding${score.findings.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {score.findings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {(['critical', 'high', 'medium', 'low'] as Severity[]).filter(k => counts[k] > 0).map(k => (
              <span key={k} className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${SEVERITY_ACCENT[k].badge}`}>
                {counts[k]} {SEVERITY_LABEL[k]}
              </span>
            ))}
          </div>
        )}

        <button onClick={onEncrypt} className="btn-primary w-full mt-1">
          Encrypt with Zcash →
        </button>

        <ShareRow shareParams={shareParams} grade={score.grade} verdict={verdict} />
      </div>

      <div className="mt-4 pt-4 border-t border-cipher-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">address</span>
          <span className="flex items-center gap-1">
            <CopyButton value={data.address} label="Copy address" compact />
            <a
              href={explorerAddressUrl(data.chain, data.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-cipher-hover transition-colors"
              aria-label="Open in block explorer"
            >
              <ExternalIcon className="w-3.5 h-3.5" />
            </a>
          </span>
        </div>
        <p className="term text-secondary break-all text-left">{data.address}</p>
        {partial && (
          <p className="text-xs text-muted text-left">
            {data.chain === 'ethereum' ? 'First and latest' : 'Latest'} {analyzed} of {data.totalTransactions.toLocaleString('en-US')} transactions analysed.
          </p>
        )}
        {!!data.ethereum?.missing.length && (
          <p className="text-xs text-cipher-orange text-left">
            Couldn&apos;t load {data.ethereum.missing.join(', ')}. The score may be understated; try again in a minute.
          </p>
        )}
        <button onClick={onReset} className="text-xs font-mono text-muted hover:text-primary transition-colors">
          ← Scan another wallet
        </button>
      </div>
    </div>
  );
}

function ShareRow({ shareParams, grade, verdict }: { shareParams: URLSearchParams; grade: string; verdict: string }) {
  const [downloading, setDownloading] = useState(false);

  const shareOnX = () => {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://cipherswap.app/exposure';
    const text = `I audited my wallet's traceability on @zecblock and got a ${grade} — "${verdict}". 😳\n\nSee what the blockchain reveals about you:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/exposure/og?${shareParams.toString()}`);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `traceability-audit-${grade}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <button onClick={shareOnX} className="px-3 py-2 rounded-lg bg-glass-6 hover:bg-glass-8 text-xs font-mono text-cipher-text-secondary hover:text-primary transition-colors">
        Share on X
      </button>
      <button onClick={downloadCard} disabled={downloading} className="px-3 py-2 rounded-lg bg-glass-6 hover:bg-glass-8 text-xs font-mono text-cipher-text-secondary hover:text-primary transition-colors disabled:opacity-50">
        {downloading ? 'Rendering…' : 'Save image'}
      </button>
    </div>
  );
}

function GradePill({ grade, score }: { grade: string; score: number }) {
  const color = GRADE_COLORS[grade] || '#EF4444';
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono font-bold text-sm" style={{ borderColor: color, color }}>
        {grade}
      </div>
      <span className="text-xs font-mono text-cipher-text-muted">{score}/100</span>
    </div>
  );
}

function ScoreRing({ score, grade, color }: { score: number; grade: string; color: string }) {
  const R = 50;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative shrink-0" style={{ width: 124, height: 124 }}>
      <svg width="124" height="124" viewBox="0 0 124 124">
        <circle cx="62" cy="62" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-glass-6" />
        <motion.circle
          cx="62" cy="62" r={R}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 62 62)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-mono font-bold leading-none" style={{ color }}>{grade}</span>
        <span className="text-xs text-cipher-text-muted font-mono mt-1">{score}/100</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4 min-w-0">
      <div className="eyebrow !text-[11px] truncate">{label}</div>
      <div className="mt-1.5 text-xl font-mono font-bold text-primary truncate">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

/* ─── Favorites ─── */

function FavoritesCard({ insights, data }: { insights: WalletInsights; data: WalletScanData }) {
  const items: { label: string; value: string; hint?: string; href?: string }[] = [];

  const walletAge = formatAccountAge(data.firstActivityTimestamp);
  const partialHistory = !!data.bitcoin && data.bitcoin.analyzedTxs < data.totalTransactions;
  if (walletAge) {
    const since = data.firstActivityTimestamp
      ? new Date(data.firstActivityTimestamp * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : null;
    items.push({
      label: 'Wallet active for',
      value: partialHistory ? `${walletAge}+` : walletAge,
      hint: since ? `${partialHistory ? 'at least since' : 'since'} ${since}` : undefined,
    });
  }

  if (insights.favoriteCounterparty) {
    const c = insights.favoriteCounterparty;
    items.push({
      label: 'Favorite counterparty',
      value: c.label || shortAddr(c.address),
      hint: `${c.count} interactions${c.isExchange ? ' · exchange' : ''}`,
      href: explorerAddressUrl(data.chain, c.address),
    });
  }
  if (insights.favoriteHour) {
    items.push({
      label: 'Most active at',
      value: formatHourUtc(insights.favoriteHour.hour),
      hint: `${Math.round(insights.favoriteHour.share * 100)}% of activity`,
    });
  }
  if (insights.favoriteDay) {
    items.push({
      label: 'Favorite day',
      value: dayName(insights.favoriteDay.day),
      hint: `${Math.round(insights.favoriteDay.share * 100)}% of activity`,
    });
  }
  if (insights.biggestTransfer) {
    const b = insights.biggestTransfer;
    items.push({
      label: 'Biggest transfer',
      value: `${b.amount.toLocaleString(undefined, { maximumFractionDigits: data.chain === 'solana' ? 2 : data.chain === 'bitcoin' ? 6 : 4 })} ${data.nativeSymbol}`,
      hint: `${b.direction === 'out' ? 'sent' : 'received'}${b.counterpartyLabel ? ` · ${b.counterpartyLabel}` : ''}`,
    });
  }
  if (insights.roundNumberBias && insights.roundNumberBias.share >= 0.3) {
    items.push({
      label: 'Round-number sends',
      value: `${Math.round(insights.roundNumberBias.share * 100)}%`,
      hint: 'manual, human pattern',
    });
  }
  if (Math.abs(insights.netFlowSol) >= 0.01) {
    items.push({
      label: `Net ${data.nativeSymbol} flow`,
      value: `${insights.netFlowSol > 0 ? '+' : ''}${insights.netFlowSol.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      hint: insights.netFlowSol > 0 ? 'accumulating' : 'offloading',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="eyebrow mb-4">
        Your fingerprint at a glance
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => {
          const Wrapper = item.href ? 'a' : 'div';
          const linkProps = item.href
            ? { href: item.href, target: '_blank' as const, rel: 'noopener noreferrer' }
            : {};
          return (
            <Wrapper
              key={item.label}
              {...linkProps}
              className={`surface-inset rounded-lg p-3 ${item.href ? 'hover:bg-glass-6 transition-colors group' : ''}`}
            >
              <div className="text-xs text-cipher-text-muted uppercase tracking-wide">{item.label}</div>
              <div className={`text-base font-mono font-bold text-primary truncate mt-1 ${item.href ? 'group-hover:text-cipher-gold transition-colors' : ''}`}>
                {item.value}
              </div>
              {item.hint && <div className="text-[11px] text-cipher-text-secondary truncate">{item.hint}</div>}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Activity heatmap ─── */

function ActivityHeatmap({ insights }: { insights: WalletInsights }) {
  const { activityHeatmap, heatmapPeak } = insights;
  const total = activityHeatmap.flat().reduce((a, b) => a + b, 0);
  if (total < 10) return null;

  return (
    <div className="card p-5">
      <h2 className="eyebrow mb-4">
        Activity heatmap <span className="text-cipher-text-muted/60 normal-case">(UTC)</span>
      </h2>
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[520px]">
          <div className="flex">
            <div className="w-8 shrink-0" />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="flex-1 text-center text-xs font-mono text-cipher-text-muted">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {activityHeatmap.map((row, day) => (
            <div key={day} className="flex items-center">
              <div className="w-8 shrink-0 text-xs font-mono text-cipher-text-muted">{dayName(day)}</div>
              {row.map((count, h) => {
                const intensity = count / heatmapPeak;
                return (
                  <div key={h} className="flex-1 px-px py-px">
                    <div
                      className="w-full rounded-[2px]"
                      style={{
                        height: '14px',
                        background: intensity === 0 ? 'var(--glass-4)' : `rgba(248, 188, 33, ${0.1 + intensity * 0.85})`,
                      }}
                      title={`${dayName(day)} ${h}:00 — ${count} events`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Exchange ledger ─── */

function ExchangeLedgerCard({ insights }: { insights: WalletInsights }) {
  return (
    <div className="card p-5">
      <h2 className="eyebrow mb-4">
        Exchange ledger <span className="text-cipher-text-muted/60 normal-case">· KYC exposure</span>
      </h2>
      <div className="space-y-2">
        {insights.exchangeLedger.map(e => (
          <div key={e.label} className="surface-inset rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cipher-orange" />
              <span className="text-sm font-mono text-primary">{e.label}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-cipher-green">{e.inCount} in</span>
              <span className="text-danger/80">{e.outCount} out</span>
              <span className="px-2 py-0.5 rounded bg-glass-6 text-cipher-text-secondary uppercase">
                {e.net}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Findings ─── */

const SEVERITY_ACCENT: Record<Severity, { bar: string; badge: string }> = {
  critical: { bar: 'var(--danger)', badge: 'bg-danger/15 text-danger' },
  high: { bar: 'var(--color-orange)', badge: 'bg-cipher-orange/15 text-cipher-orange' },
  medium: { bar: 'var(--color-gold)', badge: 'bg-cipher-gold/15 text-cipher-gold' },
  low: { bar: 'var(--color-purple)', badge: 'bg-cipher-purple/15 text-cipher-purple' },
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW',
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const FINDINGS_PREVIEW = 6;

function FindingsCard({ findings: raw }: { findings: Finding[] }) {
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const findings = [...raw].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.deduction - a.deduction);
  const visible = showAll ? findings : findings.slice(0, FINDINGS_PREVIEW);
  const hidden = findings.length - visible.length;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="eyebrow">What an adversary can learn</h2>
        <span className="text-xs font-mono text-muted">{findings.length} finding{findings.length === 1 ? '' : 's'}</span>
      </div>

      {findings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <span className="w-3 h-3 bg-cipher-green" aria-hidden />
          <p className="text-sm text-secondary">No significant exposure detected.</p>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--color-border-subtle)] -mt-1">
          {visible.map((finding, idx) => {
            const accent = SEVERITY_ACCENT[finding.severity];
            const fix = REMEDIATION[finding.id];
            const open = openId === undefined ? idx === 0 : openId === finding.id;
            return (
              <li key={finding.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : finding.id)}
                  aria-expanded={open}
                  className="w-full py-3 flex items-center gap-3 text-left group"
                >
                  <span className="w-2 h-2 shrink-0" style={{ background: accent.bar }} aria-hidden />
                  <span className="flex-1 min-w-0 text-sm font-medium text-primary group-hover:text-cipher-gold transition-colors truncate">
                    {finding.title}
                  </span>
                  <span className={`hidden sm:inline text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${accent.badge}`}>
                    {SEVERITY_LABEL[finding.severity]}
                  </span>
                  <span className="w-8 text-right text-xs font-mono text-muted">−{finding.deduction}</span>
                  <svg className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="pl-5 pb-4 -mt-1 space-y-1.5 animate-fade-in">
                    <p className="text-sm text-secondary leading-relaxed">{finding.description}</p>
                    {fix && (
                      <p className="text-sm text-primary leading-relaxed">
                        <span className="font-mono text-cipher-gold">fix →</span> {fix}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {(hidden > 0 || showAll) && findings.length > FINDINGS_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-4 w-full btn-secondary !py-2 !text-xs font-mono"
        >
          {showAll ? 'Show fewer' : `Show ${hidden} more finding${hidden === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}

/* ─── Location ─── */

function LocationCard({ timezone }: { timezone: NonNullable<ExposureScore['timezone']> }) {
  const label = offsetToTimezoneLabel(timezone.offset);
  const regions = offsetToRegions(timezone.offset);

  return (
    <div className="card p-5 h-full flex flex-col">
      <h2 className="eyebrow mb-4">Inferred location</h2>
      <div className="flex flex-col items-center text-center gap-3 flex-1 justify-center">
        <SleepClock timezone={timezone} />
        <div>
          <div className="text-2xl font-mono font-bold text-primary">{label}</div>
          <div className="text-xs text-cipher-text-muted mt-0.5">{Math.round(timezone.confidence * 100)}% confidence</div>
        </div>
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {regions.slice(0, 3).map(r => (
              <span key={r} className="text-[11px] font-mono px-2 py-0.5 rounded bg-glass-6 text-cipher-text-secondary">{r}</span>
            ))}
          </div>
        )}
        <div className="text-[11px] text-cipher-text-muted font-mono">
          Asleep {timezone.sleepWindow[0]}:00–{timezone.sleepWindow[1]}:00 UTC
        </div>
      </div>
    </div>
  );
}

function NoLocationCard({ enoughData }: { enoughData: boolean }) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <h2 className="eyebrow mb-4">Inferred location</h2>
      <div className="flex flex-col items-center justify-center text-center gap-2 flex-1 py-6">
        <span className="w-3 h-3 border-2 border-cipher-border" aria-hidden />
        {enoughData ? (
          <>
            <p className="text-sm text-secondary">No clear sleep window.</p>
            <p className="text-xs text-muted">Activity is spread around the clock, typical of services, bots or shared wallets.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-secondary">Not enough activity to infer a timezone.</p>
            <p className="text-xs text-muted">Needs 30+ timestamped transactions.</p>
          </>
        )}
      </div>
    </div>
  );
}

function SleepClock({ timezone }: { timezone: NonNullable<ExposureScore['timezone']> }) {
  const startAngle = ((timezone.sleepWindow[0] / 24) * 360 - 90) * (Math.PI / 180);
  const endAngle = ((timezone.sleepWindow[1] / 24) * 360 - 90) * (Math.PI / 180);
  const x1 = 50 + Math.cos(startAngle) * 36;
  const y1 = 50 + Math.sin(startAngle) * 36;
  const x2 = 50 + Math.cos(endAngle) * 36;
  const y2 = 50 + Math.sin(endAngle) * 36;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-glass-12" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        return (
          <line key={i} x1={50 + Math.cos(a) * 40} y1={50 + Math.sin(a) * 40} x2={50 + Math.cos(a) * 44} y2={50 + Math.sin(a) * 44} stroke="currentColor" strokeWidth="1.5" className="text-glass-18" />
        );
      })}
      <path d={`M ${x1} ${y1} A 36 36 0 0 1 ${x2} ${y2}`} fill="none" stroke="var(--color-gold)" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <circle cx="50" cy="50" r="2.5" fill="var(--color-gold)" />
    </svg>
  );
}

/* ─── Balance Card ─── */

function BehavioralProfile({ data, insights }: { data: WalletScanData; insights: WalletInsights }) {
  const [view, setView] = useState<'map' | 'list'>('map');
  const topPrograms = labelPrograms(data.programFrequency, data.programLabels).slice(0, 10);
  const programIds = new Set(topPrograms.map(p => p.programId.toLowerCase()));
  const topAddresses = insights.topCounterparties.filter(c => !programIds.has(c.address.toLowerCase())).slice(0, 8);

  const nodes: GraphNode[] = [
    { id: '__you__', label: 'YOU', count: 0, color: '#FFFFFF', kind: 'center' as const },
    ...topPrograms.map(p => ({
      id: p.programId,
      label: p.label,
      count: p.count,
      color: '#B6A0E0',
      kind: 'protocol' as const,
      href: explorerAddressUrl(data.chain, p.programId),
    })),
    ...topAddresses.map(c => ({
      id: c.address,
      label: c.label || shortAddr(c.address),
      count: c.count,
      color: c.isExchange ? '#E2A66E' : '#A1A9AD',
      kind: c.isExchange ? ('exchange' as const) : ('address' as const),
      href: explorerAddressUrl(data.chain, c.address),
    })),
  ];

  if (nodes.length <= 1) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Interaction map</h2>
        <div className="flex rounded-lg bg-glass-4 border border-glass-6 p-0.5">
          {(['map', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-mono uppercase tracking-wider transition-colors ${
                view === v ? 'bg-glass-8 text-primary' : 'text-cipher-text-muted hover:text-primary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, rotateY: -12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 12 }}
            transition={{ duration: 0.25 }}
          >
            <BubbleGraph
              nodes={nodes}
              legend={[
                ...(topPrograms.length ? [{ color: '#B6A0E0', label: 'Protocols' }] : []),
                { color: '#A1A9AD', label: 'Addresses' },
                { color: '#E2A66E', label: 'Exchanges' },
              ]}
            />
            <p className="text-xs font-mono text-cipher-text-muted/60 mt-2">
              Click a bubble to inspect the address on {CHAIN_META[data.chain].explorer}.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, rotateY: 12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -12 }}
            transition={{ duration: 0.25 }}
          >
            <InteractionList chain={data.chain} programs={topPrograms} addresses={topAddresses} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InteractionList({
  chain,
  programs,
  addresses,
}: {
  chain: ExposureChain;
  programs: { label: string; programId: string; count: number }[];
  addresses: { address: string; label?: string; isExchange: boolean; count: number }[];
}) {
  if (programs.length === 0 && addresses.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
      {programs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-cipher-text-secondary font-mono uppercase tracking-wide">Top protocols</h3>
          <div className="grid gap-1">
            {programs.map(p => (
              <a
                key={p.programId}
                href={explorerAddressUrl(chain, p.programId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-glass-3 hover:bg-glass-6 transition-colors group"
              >
                <span className="text-[11px] font-mono text-primary truncate group-hover:text-cipher-gold transition-colors">{p.label}</span>
                <span className="text-[11px] font-mono text-cipher-text-muted shrink-0 ml-2">{p.count}×</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {addresses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-cipher-text-secondary font-mono uppercase tracking-wide">Top addresses</h3>
          <div className="grid gap-1">
            {addresses.map(a => (
              <a
                key={a.address}
                href={explorerAddressUrl(chain, a.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-glass-3 hover:bg-glass-6 transition-colors group"
              >
                <span className="text-[11px] font-mono text-primary truncate group-hover:text-cipher-gold transition-colors">
                  {a.label || shortAddr(a.address)}
                  {a.isExchange && <span className="ml-1.5 text-[11px] text-cipher-yellow uppercase">CEX</span>}
                </span>
                <span className="text-[11px] font-mono text-cipher-text-muted shrink-0 ml-2">{a.count}×</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatName(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Encrypt gate modal ─── */

function EncryptGate({ chain, onClose, walletConnected }: { chain: ExposureChain; onClose: () => void; walletConnected: boolean }) {
  const [step, setStep] = useState<'ask' | 'wallets'>('ask');

  const goToSwap = () => {
    window.location.href = `/?from=${chain}`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card card-static w-full max-w-md p-6 relative"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-cipher-text-muted hover:text-primary text-lg leading-none">×</button>

        {step === 'ask' ? (
          <div className="space-y-5 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-mono font-bold text-primary">Encrypt your wallet</h2>
              <p className="text-cipher-text-secondary text-sm max-w-xs mx-auto">
                Move your funds to shielded Zcash. First — do you already have a Zcash wallet?
              </p>
            </div>
            <div className="space-y-2.5">
              <button onClick={goToSwap} className="btn-primary w-full">
                Yes, I have one → continue
              </button>
              <button
                onClick={() => setStep('wallets')}
                className="w-full py-3 rounded-lg bg-glass-6 hover:bg-glass-8 text-sm font-mono text-primary transition-colors"
              >
                No, help me get one
              </button>
            </div>
            {walletConnected && (
              <p className="text-[11px] text-cipher-green font-mono">✓ {CHAIN_META[chain].label} wallet connected. {CHAIN_META[chain].label} will be pre-selected as your source.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5 text-center">
              <h2 className="text-xl font-mono font-bold text-primary">Get a Zcash wallet</h2>
              <p className="text-cipher-text-secondary text-sm">Grab one of these, then come back and continue.</p>
            </div>
            <div className="space-y-2.5">
              {ZCASH_WALLETS.map(w => (
                <a
                  key={w.id}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block surface-inset rounded-lg p-4 hover:bg-glass-6 transition-colors border border-glass-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">{w.name}</span>
                    {w.recommended && (
                      <span className="text-[11px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-cipher-green/15 text-cipher-green">Recommended</span>
                    )}
                  </div>
                  <p className="text-[11px] text-cipher-text-secondary mt-1 leading-relaxed">{w.tagline}</p>
                  <p className="text-xs text-cipher-text-muted font-mono mt-1.5">{w.platforms}</p>
                </a>
              ))}
            </div>
            <button onClick={goToSwap} className="btn-primary w-full">
              I've installed one — I'm ready →
            </button>
            <button onClick={() => setStep('ask')} className="w-full text-xs font-mono text-cipher-text-muted hover:text-primary transition-colors">
              ← Back
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Error ─── */

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card p-8 text-center space-y-4 mt-8">
      <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
        <span className="text-danger text-xl">!</span>
      </div>
      <p className="text-primary font-mono">{message}</p>
      <button onClick={onRetry} className="btn-primary inline-block !w-auto px-8 mx-auto">Try again</button>
    </div>
  );
}

/* ─── helpers ─── */

function formatAccountAge(firstTs: number | null): string | null {
  if (!firstTs) return null;
  const days = (Date.now() - firstTs * 1000) / (1000 * 60 * 60 * 24);
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${Math.max(1, Math.floor(days))} day${days >= 2 ? 's' : ''}`;
}
