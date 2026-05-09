'use client';

import type { ReactNode } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { SectionLabel } from './SectionLabel';
import { useZecPrice } from './ZecPriceContext';
import type { SwapState } from './types';
import { getChainEtaLabel } from './types';

interface SidebarProps {
  state: SwapState;
}

export function Sidebar({ state }: SidebarProps) {
  const { price: zecPrice, change24h } = useZecPrice();

  return (
    <div className="space-y-4">
      {state.kind === 'connect' && <WhyConnectPanel />}
      {(state.kind === 'form' || state.kind === 'quoting') && (
        state.mode === 'manual' ? <HowToSendPanel chain={state.selectedToken.chainLabel} /> : <WalletInfoPanel />
      )}
      {(state.kind === 'quote' || state.kind === 'waiting') && (
        <div className="hidden lg:block">
          <TimingPanel chain={state.selectedToken.chain} chainLabel={state.selectedToken.chainLabel} step={state.kind} txHash={state.kind === 'waiting' ? state.txHash : undefined} />
        </div>
      )}
      {state.kind === 'complete' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-xs text-muted font-mono leading-relaxed">
              Your ZEC has arrived. For maximum privacy, shield your balance using a wallet that supports Orchard.
            </p>
          </div>
        </div>
      )}

      {/* ZEC price card */}
      {zecPrice && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TokenChainIcon token="zec" chain="zec" size={18} />
              <span className="text-sm font-mono font-semibold text-primary">${zecPrice.toFixed(2)}</span>
            </div>
            {change24h != null && (
              <span className={`text-xs font-mono ${change24h >= 0 ? 'text-cipher-green' : 'text-cipher-orange'}`}>
                {change24h >= 0 ? '↑' : '↓'}{Math.abs(change24h).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <a href="https://cipherscan.app/crosschain" className="px-5 py-3.5 text-xs font-mono text-muted hover:text-cipher-cyan transition-colors flex items-center justify-between">
          <span>Crosschain Analytics on CipherScan</span>
          <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}

function WhyConnectPanel() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-4">
        <SectionLabel label="WHY_CONNECT" />
      </div>
      <div className="p-5 space-y-3">
        {[
          { label: 'Filtered tokens', desc: 'Only see assets your wallet supports' },
          { label: 'Auto-fill addresses', desc: 'No copy-pasting needed for refunds' },
          { label: 'One-click send', desc: 'Send directly from CipherSwap' },
        ].map(item => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cipher-cyan mt-1.5 shrink-0" />
            <div>
              <div className="text-xs font-mono font-medium text-primary">{item.label}</div>
              <div className="text-[11px] font-mono text-muted leading-relaxed">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletInfoPanel() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-4">
        <SectionLabel label="PRIVACY_TIPS" />
      </div>
      <div className="p-5">
        <p className="text-xs text-muted font-mono leading-relaxed">
          Use a unified (u1) address to receive funds directly into the Orchard shielded pool.
          Common amounts blend better with other shielded transactions.
        </p>
      </div>
    </div>
  );
}

function HowToSendPanel({ chain }: { chain: string }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-4">
        <SectionLabel label="HOW_TO_SEND" />
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs text-muted font-mono leading-relaxed">
          Use any {chain} wallet that supports custom send addresses — exchange withdrawals work too.
        </p>
        <div className="space-y-2">
          {[
            'Get a quote and confirm',
            'Copy the deposit address or scan the QR',
            'Send the exact amount from your wallet',
            <>ZEC arrives at your address automatically</>,
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[11px] font-mono text-cipher-cyan/60 mt-0.5 shrink-0">{i + 1}.</span>
              <span className="text-[11px] font-mono text-muted leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimingPanel({ chain, chainLabel, step, txHash }: { chain: string; chainLabel: string; step: string; txHash?: string }) {
  const estimate = getChainEtaLabel(chain);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-4">
        <SectionLabel label="ESTIMATED_TIME" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cipher-cyan/10 flex items-center justify-center shrink-0">
            <TokenChainIcon token={chain} chain={chain} size={18} />
          </div>
          <div>
            <div className="text-sm font-mono font-semibold text-primary">{estimate}</div>
            <div className="text-[11px] font-mono text-muted">via {chainLabel}</div>
          </div>
        </div>
        <div className="space-y-2.5 pt-1">
          <StepDot active={step === 'waiting' && !txHash} done={!!txHash} label="Deposit to bridge address" />
          <StepDot active={step === 'waiting' && !!txHash} done={false} label="NEAR Intents bridging" />
          <StepDot active={false} done={false} label={<>ZEC sent to your address</>} />
        </div>
        <p className="text-[11px] font-mono text-muted/60 leading-relaxed pt-1">
          Times depend on {chainLabel} block confirmations and NEAR solver availability.
        </p>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${done ? 'bg-cipher-green' : active ? 'bg-cipher-cyan animate-pulse' : 'bg-glass-12'}`} />
      <span className={`text-[11px] font-mono ${done || active ? 'text-secondary' : 'text-muted'}`}>{label}</span>
    </div>
  );
}
