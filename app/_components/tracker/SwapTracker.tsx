'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { useSwapStatus } from '@/hooks/useSwapStatus';
import { useTokenList } from '@/hooks/useTokenList';
import { STATUS_META, TERMINAL_STATUSES, type QuoteResponse, type StatusResponse, type SwapStatus } from '@/lib/near-intents';
import { appendLog, getSwap, removeSwap, SWAP_HISTORY_EVENT, updateSwap, type SwapLogEntry, type SwapRecord } from '@/lib/swap-history';
import { formatUsd, formatZec, fromSmallestUnit } from '@/lib/amount';
import { shortAddress, zecAddressKind } from '@/lib/deposit';
import { CHAIN_EXPLORERS, resolveAsset } from '../types';
import { CopyButton, ExternalIcon, Spinner } from '../ui';
import { DepositPanel } from './DepositPanel';
import { VerifyDrawer } from './VerifyDrawer';

const STEPS = ['Deposit', 'Detected', 'Swapping', 'Delivered'];

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function elapsed(fromMs: number, toMs: number): string {
  const s = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}h ${mm}m` : m ? `${m}m ${ss}s` : `${sec}s`;
}

function statusDetail(s: StatusResponse): string | undefined {
  const d = s.swapDetails;
  if (s.status === 'KNOWN_DEPOSIT_TX' || s.status === 'PROCESSING') {
    const tx = d?.originChainTxHashes?.[0]?.hash;
    return tx ? shortAddress(tx, 8, 6) : undefined;
  }
  if (s.status === 'INCOMPLETE_DEPOSIT') return d?.depositedAmountFormatted ? `received ${d.depositedAmountFormatted}` : undefined;
  if (s.status === 'SUCCESS') return d?.amountOutFormatted ? `${d.amountOutFormatted} ZEC` : undefined;
  if (s.status === 'REFUNDED') return d?.refundedAmountFormatted ? `${d.refundedAmountFormatted} returned` : undefined;
  return undefined;
}

function ProgressRail({ status, sent }: { status: SwapStatus | null; sent: boolean }) {
  const meta = status ? STATUS_META[status] : null;
  // A wallet broadcast completes the deposit step before NEAR Intents reports it.
  const current = Math.max(meta?.step ?? 0, sent ? 1 : 0);
  const terminalTone = meta && meta.step === 3 ? meta.tone : null;
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Swap progress">
      {STEPS.map((label, i) => {
        const done = i < current || (i === 3 && terminalTone === 'success');
        const here = i === current && !done;
        const bar =
          i === 3 && terminalTone === 'error' ? 'bg-danger'
            : i === 3 && terminalTone === 'warning' ? 'bg-cipher-orange'
              : done ? 'bg-cipher-green'
                : here ? 'bg-cipher-gold motion-safe:animate-pulse'
                  : 'bg-glass-8';
        return (
          <li key={label} aria-current={here ? 'step' : undefined}>
            <div className={`h-1 rounded-md ${bar}`} />
            <span className={`mt-1.5 block text-xs ${done || here ? 'text-secondary' : 'text-muted'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusLog({ lines, liveLine, now }: { lines: SwapLogEntry[]; liveLine?: string | null; now: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
      >
        <span aria-hidden className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        Activity log
        {!open && liveLine && <span className="ml-2 font-mono text-muted/70">{liveLine.replace(/\s+/g, ' ')}</span>}
      </button>
      {open && <StatusLines lines={lines} liveLine={liveLine} now={now} />}
    </div>
  );
}

function StatusLines({ lines, liveLine, now }: { lines: SwapLogEntry[]; liveLine?: string | null; now: number }) {
  return (
    <div className="mt-2 rounded-lg bg-glass-2 border border-glass-4 px-3.5 py-2.5 overflow-x-auto" aria-label="Swap log">
      <ul className="term space-y-0.5 min-w-max">
        {lines.map((l, i) => (
          <li key={`${l.at}-${l.code}-${i}`} className="flex gap-3">
            <span className="text-muted">[{clock(l.at)}]</span>
            <span className={l.code === 'delivered' ? 'text-cipher-green' : l.code === 'failed' ? 'text-danger' : l.code === 'refunded' || l.code === 'incomplete_deposit' ? 'text-cipher-orange' : 'text-secondary'}>
              {l.code.padEnd(20, ' ')}
            </span>
            {l.detail && <span className="text-muted">{l.detail}</span>}
          </li>
        ))}
        {liveLine && (
          <li className="flex gap-3">
            <span className="text-muted">[{clock(now)}]</span>
            <span className="text-cipher-gold">{liveLine}</span>
            <span className="text-cipher-gold motion-safe:animate-pulse" aria-hidden>▍</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function TxLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 term text-cipher-gold hover:underline">
      {label}
      <ExternalIcon className="w-3 h-3" />
    </a>
  );
}

export function SwapTracker({ depositAddress, memo }: { depositAddress: string; memo?: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<SwapRecord | undefined>();
  const [recordLoaded, setRecordLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { tokens } = useTokenList();

  useEffect(() => {
    const load = () => {
      setRecord(getSwap(depositAddress));
      setRecordLoaded(true);
    };
    load();
    window.addEventListener(SWAP_HISTORY_EVENT, load);
    return () => window.removeEventListener(SWAP_HISTORY_EVENT, load);
  }, [depositAddress]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const depositMemo = memo ?? record?.depositMemo;
  const status = useSwapStatus(depositAddress, depositMemo, recordLoaded ? record?.createdAt ?? 0 : null);
  const s = status.data;
  const current = s?.status ?? null;
  const meta = current ? STATUS_META[current] : null;
  const terminal = current ? TERMINAL_STATUSES.has(current) : false;

  // Persist transitions so the log survives reloads; only for swaps this browser created.
  useEffect(() => {
    if (!s || !record) return;
    if (record.lastStatus !== s.status || (!record.quoteResponse && s.quoteResponse)) {
      updateSwap(depositAddress, {
        lastStatus: s.status,
        ...(s.quoteResponse && !record.quoteResponse ? { quoteResponse: s.quoteResponse } : {}),
      });
    }
    appendLog(depositAddress, { at: Date.parse(s.updatedAt) || Date.now(), code: STATUS_META[s.status].code, detail: statusDetail(s) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.status, s?.updatedAt, !!record]);

  const qr: QuoteResponse | undefined = s?.quoteResponse ?? record?.quoteResponse;
  const asset = useMemo(() => {
    if (record) return { symbol: record.token, chain: record.chain, chainLabel: record.chainLabel };
    if (qr) return resolveAsset(qr.quoteRequest.originAsset, tokens);
    return null;
  }, [record, qr, tokens]);

  const quotedAt = qr ? Date.parse(qr.timestamp) : record?.createdAt;
  const endAt = terminal && s ? Date.parse(s.updatedAt) : now;
  const deadline = qr?.quote.deadline ? Date.parse(qr.quote.deadline) : null;
  const recipient = qr?.quoteRequest.recipient ?? record?.zecAddress ?? '';
  const refundTo = qr?.quoteRequest.refundTo ?? record?.refundAddress ?? '';
  const amountIn = qr?.quote.amountInFormatted ?? record?.amount ?? '';
  const estOut = qr?.quote.amountOutFormatted ?? record?.estimatedZec ?? '';
  const txHash = record?.txHash;
  const originExplorer = asset ? CHAIN_EXPLORERS[asset.chain] : undefined;

  const recordLog = record?.log;
  const lines: SwapLogEntry[] = useMemo(() => {
    // Entries are appended as they are observed; status times come from NEAR Intents, so order by time.
    if (recordLog?.length) return [...recordLog].sort((a, b) => a.at - b.at);
    const out: SwapLogEntry[] = [];
    if (qr) out.push({ at: Date.parse(qr.timestamp), code: 'quote_signed', detail: shortAddress(depositAddress, 8, 6) });
    if (s) out.push({ at: Date.parse(s.updatedAt), code: STATUS_META[s.status].code, detail: statusDetail(s) });
    return out;
  }, [recordLog, qr, s, depositAddress]);

  const liveLine = status.connectionError
    ? `status_check_failed  retrying in ${Math.max(0, Math.ceil(((status.nextRetryAt ?? now) - now) / 1000))}s`
    : !terminal && s
      ? `polling near-intents  next in ${Math.max(0, Math.ceil(((status.nextRetryAt ?? now) - now) / 1000))}s`
      : null;

  const loading = !s && !status.notFound && !status.connectionError;
  const awaitingDeposit = current === 'PENDING_DEPOSIT' || (!current && !status.notFound);
  const incomplete = current === 'INCOMPLETE_DEPOSIT';
  const remaining = useMemo(() => {
    if (!incomplete || !qr || !s?.swapDetails?.depositedAmount || !record) return null;
    const diff = BigInt(qr.quote.amountIn) - BigInt(s.swapDetails.depositedAmount);
    return diff > BigInt(0) ? fromSmallestUnit(diff, record.decimals) : null;
  }, [incomplete, qr, s, record]);

  const canDiscard = !!record && awaitingDeposit && !txHash;

  if (status.notFound && !qr) {
    return (
      <div className="swap-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold text-primary">No swap found</h1>
        <p className="text-sm text-secondary">NEAR Intents has no swap for this deposit address. Check the link, or start a new swap.</p>
        <p className="term text-muted break-all">{depositAddress}</p>
        <Link href="/" className="btn-primary !inline-block !w-auto px-6">New swap</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="swap-card p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {loading ? <Spinner className="w-3 h-3" /> : (
                <span
                  className={`w-2 h-2 ${
                    meta?.tone === 'success' ? 'bg-cipher-green' : meta?.tone === 'error' ? 'bg-danger' : meta?.tone === 'warning' ? 'bg-cipher-orange' : 'bg-cipher-gold motion-safe:animate-pulse'
                  }`}
                  aria-hidden
                />
              )}
              <span className="term text-muted">{meta?.code ?? 'connecting'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-primary" aria-live="polite">
              {loading ? 'Checking swap status…' : meta?.title ?? 'Waiting for your deposit'}
            </h1>
          </div>
          {quotedAt ? (
            <div className="text-right shrink-0 pt-0.5">
              <div className="text-sm text-secondary tabular-nums">{elapsed(quotedAt, endAt)}</div>
              <div className="text-xs text-muted">{terminal ? 'total' : 'elapsed'}</div>
            </div>
          ) : null}
        </div>

        <ProgressRail status={current} sent={!!txHash && (!current || current === 'PENDING_DEPOSIT')} />

        {asset && current !== 'SUCCESS' && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-glass-2 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TokenChainIcon token={asset.symbol} chain={asset.chain} size={28} />
              <div className="min-w-0">
                <div className="text-sm text-primary tabular-nums truncate">{formatZec(amountIn, 6)} {asset.symbol}</div>
                <div className="text-xs text-muted">{asset.chainLabel}</div>
              </div>
            </div>
            <span className="text-muted" aria-hidden>→</span>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0 text-right">
                <div className="text-sm text-primary tabular-nums truncate">≈ {formatZec(estOut, 6)} ZEC</div>
                <div className="text-xs text-muted">estimated</div>
              </div>
              <TokenChainIcon token="zec" chain="zec" size={28} />
            </div>
          </div>
        )}

        {/* State-specific body */}
        {awaitingDeposit && !txHash && qr && asset && (
          <DepositPanel
            chain={asset.chain}
            chainLabel={asset.chainLabel}
            token={asset.symbol}
            amount={amountIn}
            address={depositAddress}
            memo={depositMemo}
            contractAddress={record?.contractAddress}
            deadline={deadline}
            now={now}
          />
        )}

        {awaitingDeposit && txHash && (
          <div className="space-y-1.5">
            <p className="text-sm text-secondary leading-relaxed">
              Sent from your wallet. It usually takes a block or two on {asset?.chainLabel ?? 'the source chain'} before NEAR Intents sees it.
            </p>
            {originExplorer && <TxLink href={`${originExplorer}${txHash}`} label={`deposit tx ${shortAddress(txHash, 8, 6)}`} />}
          </div>
        )}

        {incomplete && (
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-2xl bg-cipher-orange/[0.06] border border-cipher-orange/25 text-sm text-secondary leading-relaxed">
              NEAR Intents received <span className="term text-primary">{s?.swapDetails?.depositedAmountFormatted ?? 'less'} {asset?.symbol}</span> but
              the quote needs <span className="term text-primary">{amountIn} {asset?.symbol}</span>.
              {remaining ? ' Send the difference to the same address before the deadline, or the deposit is refunded to your refund address.' : ' The deposit will be refunded to your refund address.'}
            </div>
            {remaining && asset && (
              <DepositPanel
                chain={asset.chain}
                chainLabel={asset.chainLabel}
                token={asset.symbol}
                amount={remaining}
                address={depositAddress}
                memo={depositMemo}
                contractAddress={record?.contractAddress}
                deadline={deadline}
                now={now}
                topUp
              />
            )}
          </div>
        )}

        {current === 'PROCESSING' && (
          <p className="text-sm text-secondary">
            Deposit confirmed. ZEC is on its way. You can close this page; the link keeps working.
          </p>
        )}

        {current === 'SUCCESS' && s && (
          <Receipt status={s} quote={qr} recipient={recipient} paid={asset ? `${formatZec(amountIn, 6)} ${asset.symbol}` : null} />
        )}

        {current === 'REFUNDED' && s && (
          <div className="space-y-2 text-sm text-secondary">
            <p>
              The swap didn&apos;t go through, so NEAR Intents returned{' '}
              <span className="term text-primary">{s.swapDetails?.refundedAmountFormatted ?? 'your deposit'} {asset?.symbol}</span> to{' '}
              <span className="term text-primary">{shortAddress(refundTo, 8, 6)}</span>.
            </p>
            {s.swapDetails?.refundReason && <p className="term text-muted">reason: {s.swapDetails.refundReason.toLowerCase()}</p>}
          </div>
        )}

        {current === 'FAILED' && (
          <div className="space-y-2 text-sm text-secondary">
            <p>
              The swap failed. Any deposit is returned automatically to your refund address{' '}
              <span className="term text-primary">{shortAddress(refundTo, 8, 6)}</span>.
            </p>
            <p className="text-muted">
              If nothing arrives within a few hours, contact support with the signed quote from “Verify this swap” below.
            </p>
          </div>
        )}

        <StatusLog lines={lines} liveLine={liveLine} now={now} />
      </div>

      <VerifyDrawer
        depositAddress={depositAddress}
        memo={depositMemo}
        quote={qr}
        status={s}
        recipient={recipient}
        refundTo={refundTo}
        originExplorer={originExplorer}
        txHash={txHash}
      />

      <div className="px-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="flex items-center gap-2">
          Anyone with this link can see this swap. Don&apos;t post it publicly.
          <CopyButton value={typeof window !== 'undefined' ? window.location.href : ''} label="Copy link" compact />
        </span>
        <span className="flex items-center gap-4">
          {canDiscard && (
            <button type="button" onClick={() => setConfirmDiscard(true)} className="hover:text-danger transition-colors">
              I haven&apos;t sent anything, discard
            </button>
          )}
          {current !== 'SUCCESS' && <Link href="/" className="text-secondary hover:text-primary">New swap →</Link>}
        </span>
      </div>

      {confirmDiscard && (
        <div role="alertdialog" aria-label="Discard swap" className="swap-card p-4 space-y-3">
          <p className="text-sm text-primary">Only discard if you have not sent any funds.</p>
          <p className="text-xs text-muted leading-relaxed">
            This removes the swap from this browser. The deposit address stays active
            {deadline ? ` until ${new Date(deadline).toLocaleString()}` : ''}: anything sent to it still swaps, but you&apos;d need this exact link to track it.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmDiscard(false)}>Keep tracking</button>
            <button
              type="button"
              className="btn-secondary flex-1 !text-danger !border-danger/30"
              onClick={() => { removeSwap(depositAddress); router.push('/'); }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Receipt({ status, quote, recipient, paid }: { status: StatusResponse; quote?: QuoteResponse; recipient: string; paid: string | null }) {
  const d = status.swapDetails;
  const zecTx = d?.destinationChainTxHashes?.[0]?.hash;
  const inUsd = parseFloat(d?.amountInUsd ?? '');
  const outUsd = parseFloat(d?.amountOutUsd ?? '');
  const cost = inUsd > 0 && outUsd > 0 ? (1 - outUsd / inUsd) * 100 : null;
  const took = quote ? Date.parse(status.updatedAt) - Date.parse(quote.timestamp) : null;
  const kind = zecAddressKind(recipient);
  const transparent = kind === 'transparent';

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="text-[2.25rem] font-medium tracking-tight leading-none tabular-nums text-primary">
          {d?.amountOutFormatted ? formatZec(d.amountOutFormatted, 8) : '—'} <span className="text-secondary text-2xl">ZEC</span>
        </div>
        <div className="mt-2 text-sm text-muted tabular-nums">
          {d?.amountOutUsd ? `≈ ${formatUsd(d.amountOutUsd)}` : ''}
          {paid ? ` · for ${paid}` : ''}
        </div>
      </div>

      <dl className="divide-y divide-glass-4 border-y border-glass-4 text-sm">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">To</dt>
          <dd className="flex items-center gap-2 text-secondary">
            <span className="font-mono text-[0.8125rem]">{shortAddress(recipient, 6, 6)}</span>
            <span className={transparent ? 'text-cipher-orange' : 'text-muted'}>{transparent ? 'transparent' : kind ? 'shielded' : ''}</span>
          </dd>
        </div>
        {took != null && took > 0 && (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Took</dt>
            <dd className="text-secondary tabular-nums">{elapsed(0, took)}</dd>
          </div>
        )}
        {cost != null && (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Total cost</dt>
            <dd className="text-secondary tabular-nums">{cost.toFixed(2)}%</dd>
          </div>
        )}
        {zecTx && (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Transaction</dt>
            <dd><TxLink href={`https://zecblock.com/tx/${zecTx}`} label={`${shortAddress(zecTx, 6, 6)} on ZecBlock`} /></dd>
          </div>
        )}
      </dl>

      {transparent && (
        <p className="text-sm text-cipher-orange leading-relaxed">
          This landed in a transparent address, which is public. Move it to a shielded address in a wallet like Zashi.
        </p>
      )}
      <div className="space-y-3">
        <Link href="/" className="btn-primary text-center">New swap</Link>
        <Link href="/exposure" className="block text-center text-[0.8125rem] text-muted hover:text-primary transition-colors">
          Check your wallet&apos;s exposure →
        </Link>
      </div>
    </div>
  );
}
