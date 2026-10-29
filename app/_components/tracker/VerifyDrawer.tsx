'use client';

import { useState } from 'react';
import type { QuoteResponse, StatusResponse } from '@/lib/near-intents';
import { shortAddress } from '@/lib/deposit';
import { ChevronIcon, CopyButton, ExternalIcon } from '../ui';

function Field({ label, value, href, mono = true }: { label: string; value: string; href?: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_auto] items-start gap-3 py-1.5 border-b border-glass-4 last:border-0">
      <span className="text-xs text-muted pt-0.5">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${mono ? 'term' : 'text-xs'} text-cipher-gold hover:underline break-all inline-flex items-start gap-1`}>
          {value}
          <ExternalIcon className="w-3 h-3 mt-1 shrink-0" />
        </a>
      ) : (
        <span className={`${mono ? 'term' : 'text-xs'} text-secondary break-all`}>{value}</span>
      )}
      <CopyButton value={value} label={`Copy ${label}`} compact />
    </div>
  );
}

/** Everything needed to check this swap independently of CipherSwap. */
export function VerifyDrawer({
  depositAddress,
  memo,
  quote,
  status,
  recipient,
  refundTo,
  originExplorer,
  txHash,
}: {
  depositAddress: string;
  memo?: string;
  quote?: QuoteResponse;
  status: StatusResponse | null;
  recipient: string;
  refundTo: string;
  originExplorer?: string;
  txHash?: string;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(false);
  const d = status?.swapDetails;

  const download = () => {
    if (!quote) return;
    const blob = new Blob([JSON.stringify(quote, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cipherswap-quote-${depositAddress.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const originTxs = d?.originChainTxHashes?.length
    ? d.originChainTxHashes
    : txHash
      ? [{ hash: txHash, explorerUrl: originExplorer ? `${originExplorer}${txHash}` : '' }]
      : [];

  return (
    <div className="swap-card !rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-primary">Verify this swap</span>
          <span className="block text-xs text-muted">Signed quote, addresses and on-chain transactions. Don&apos;t trust, verify.</span>
        </span>
        <ChevronIcon open={open} className="w-4 h-4 text-muted shrink-0" />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-4 animate-fade-in">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-1">Quote</h3>
            <Field label="Deposit address" value={depositAddress} />
            {memo && <Field label="Deposit memo" value={memo} />}
            {recipient && <Field label="ZEC recipient" value={recipient} />}
            {refundTo && <Field label="Refund to" value={refundTo} />}
            {quote && (
              <>
                <Field label="Amount in (base)" value={quote.quote.amountIn} />
                <Field label="Min out (zats)" value={quote.quote.minAmountOut} />
                {quote.quote.deadline && <Field label="Deadline" value={quote.quote.deadline} />}
                <Field label="Signed at" value={quote.timestamp} />
                <Field label="1Click signature" value={quote.signature} />
                <Field label="Correlation ID" value={quote.correlationId} />
                {quote.quoteRequest.appFees?.map((f) => (
                  <Field key={f.recipient} label={`App fee ${(f.fee / 100).toFixed(2)}%`} value={f.recipient} />
                ))}
              </>
            )}
          </section>

          {(originTxs.length > 0 || d?.nearTxHashes?.length || d?.destinationChainTxHashes?.length) ? (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted mb-1">Transactions</h3>
              {originTxs.map((t) => (
                <Field key={t.hash} label="Deposit (origin)" value={t.hash} href={t.explorerUrl || undefined} />
              ))}
              {d?.nearTxHashes?.map((h) => (
                <Field key={h} label="NEAR settlement" value={h} href={`https://nearblocks.io/txns/${h}`} />
              ))}
              {d?.intentHashes?.map((h) => <Field key={h} label="Intent hash" value={h} />)}
              {d?.destinationChainTxHashes?.map((t) => (
                <Field key={t.hash} label="ZEC delivery" value={t.hash} href={`https://zecblock.com/tx/${t.hash}`} />
              ))}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {quote && (
              <button type="button" onClick={download} className="btn-secondary !py-2 !text-xs">
                Download signed quote (.json)
              </button>
            )}
            {status && (
              <button type="button" onClick={() => setRaw((v) => !v)} className="btn-secondary !py-2 !text-xs">
                {raw ? 'Hide raw status' : 'Show raw status'}
              </button>
            )}
          </div>
          {quote && (
            <p className="text-xs text-muted leading-relaxed">
              NEAR Intents signs each quote for its deposit address. Keep the file: it&apos;s your proof of the agreed
              terms if you ever need to dispute a swap ({shortAddress(quote.signature, 14, 6)}).
            </p>
          )}
          {raw && status && (
            <pre className="term !text-[0.6875rem] text-secondary bg-black/30 rounded-xl p-3 overflow-x-auto max-h-80">
              {JSON.stringify(status, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
