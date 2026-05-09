'use client';

import { useState } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { SwapSummary } from '../SwapSummary';
import { QrCode } from '../QrCode';
import type { SourceToken, Mode } from '../types';
import { CHAIN_EXPLORERS, getChainEtaLabel } from '../types';

interface WaitingProps {
  mode: Mode;
  amount: string;
  selectedToken: SourceToken;
  estimatedZec: string;
  depositAddress: string;
  txHash?: string;
  swapStatus: string;
  sendingTx: boolean;
  walletError: string;
  onSendFromWallet: () => void;
  onCancel: () => void;
}

export function Waiting({
  mode, amount, selectedToken, estimatedZec, depositAddress, txHash,
  swapStatus, sendingTx, walletError, onSendFromWallet, onCancel,
}: WaitingProps) {
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = CHAIN_EXPLORERS[selectedToken.chain];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-lg bg-glass-2 border border-glass-4 p-4">
        <SwapSummary amount={amount} token={selectedToken} estimatedZec={estimatedZec} compact />
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2.5 py-1">
        <div className="w-2 h-2 rounded-full bg-cipher-cyan animate-pulse" />
        <span className="text-xs font-mono text-secondary uppercase tracking-wider">
          {swapStatus ? swapStatus.replace(/_/g, ' ') : 'Waiting for deposit'}
        </span>
      </div>

      {/* Mobile-only ETA + step timeline (sidebar shows it on desktop) */}
      <MobileTimeline
        chain={selectedToken.chain}
        chainLabel={selectedToken.chainLabel}
        txHash={txHash}
      />

      {/* Wallet path: send button */}
      {mode === 'wallet' && !txHash && (
        <button
          onClick={onSendFromWallet}
          disabled={sendingTx}
          className="w-full py-3.5 rounded-lg font-mono font-semibold text-sm bg-cipher-green text-[#08090F] hover:shadow-[0_4px_20px_rgb(var(--color-green-rgb)_/_0.2)] hover:-translate-y-[1px] active:translate-y-0 transition-all disabled:opacity-50"
        >
          {sendingTx ? 'Confirm in wallet...' : `Send ${amount} ${selectedToken.token}`}
        </button>
      )}

      {/* Tx hash card (after broadcast) */}
      {txHash && (
        <div className="rounded-lg bg-glass-2 border border-glass-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-cipher-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="text-[11px] font-mono text-cipher-green">Sent</span>
              <code className="text-[11px] text-muted/70 font-mono ml-1">{txHash.slice(0, 8)}...{txHash.slice(-6)}</code>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copy(txHash)}
                className="p-1.5 rounded-md hover:bg-glass-4 transition-colors"
                aria-label="Copy transaction hash"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-cipher-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-muted hover:text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
              {explorerUrl && (
                <a
                  href={`${explorerUrl}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md hover:bg-glass-4 transition-colors"
                  aria-label="View on block explorer"
                >
                  <svg className="w-3.5 h-3.5 text-muted hover:text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {walletError && <p className="text-xs text-red-400 text-center font-mono">{walletError}</p>}

      {/* Manual deposit: wallet path shows collapsed, manual path shows directly */}
      {mode === 'manual' ? (
        <DepositCard address={depositAddress} amount={amount} token={selectedToken.token} onCopy={copy} copied={copied} />
      ) : !txHash ? (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-glass-4" />
            <button onClick={() => setShowManual(!showManual)} className="text-[11px] font-mono text-muted hover:text-secondary transition-colors">
              {showManual ? 'Hide manual send' : 'or send manually'}
            </button>
            <div className="flex-1 h-px bg-glass-4" />
          </div>
          {showManual && <DepositCard address={depositAddress} amount={amount} token={selectedToken.token} onCopy={copy} copied={copied} />}
        </>
      ) : null}

      {/* Footer */}
      {txHash ? (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-muted/60">Swap will complete automatically</span>
          <button onClick={onCancel} className="text-[11px] font-mono text-muted hover:text-secondary transition-colors">New Swap →</button>
        </div>
      ) : (
        <button onClick={onCancel} className="w-full py-2.5 rounded-lg text-xs font-mono text-muted hover:text-secondary border border-glass-6 hover:border-glass-12 transition-all">
          Cancel
        </button>
      )}
    </div>
  );
}

function MobileTimeline({ chain, chainLabel, txHash }: { chain: string; chainLabel: string; txHash?: string }) {
  const eta = getChainEtaLabel(chain);
  const steps = [
    { label: 'Deposit to bridge address', done: !!txHash, active: !txHash },
    { label: 'NEAR Intents bridging', done: false, active: !!txHash },
    { label: 'ZEC sent to your address', done: false, active: false },
  ];
  return (
    <div className="lg:hidden rounded-lg bg-glass-2 border border-glass-4 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-cipher-cyan/10 flex items-center justify-center shrink-0">
          <TokenChainIcon token={chain} chain={chain} size={18} />
        </div>
        <div>
          <div className="text-sm font-mono font-semibold text-primary">{eta}</div>
          <div className="text-[11px] text-muted">via {chainLabel}</div>
        </div>
      </div>
      <div className="space-y-2 pt-1">
        {steps.map((s) => (
          <div key={s.label} className="flex items-start gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.done ? 'bg-cipher-green' : s.active ? 'bg-cipher-cyan animate-pulse' : 'bg-glass-12'}`} />
            <span className={`text-[11px] font-mono ${s.done || s.active ? 'text-secondary' : 'text-muted'}`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepositCard({ address, amount, token, onCopy, copied }: { address: string; amount: string; token: string; onCopy: (s: string) => void; copied: boolean }) {
  return (
    <div className="rounded-lg bg-glass-2 border border-glass-4 p-4 space-y-3">
      <div className="text-[10px] font-mono text-muted uppercase tracking-wider">Deposit address</div>
      <div className="flex items-start gap-3">
        <QrCode value={address} size={120} />
        <div className="flex-1 min-w-0">
          <code className="text-[11px] text-secondary break-all font-mono leading-relaxed block">{address}</code>
          <button
            onClick={() => onCopy(address)}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-4 hover:bg-glass-6 transition-colors"
            aria-label="Copy deposit address"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-cipher-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
            <span className="text-[11px] font-mono text-muted">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <p className="text-[11px] text-cipher-yellow/80 font-mono leading-relaxed">
        Send exactly {amount} {token} to this address — overpayment is not refunded.
      </p>
    </div>
  );
}
