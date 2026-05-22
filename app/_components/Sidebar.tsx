'use client';

import type { ReactNode } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { SectionLabel } from './SectionLabel';
import { PrivacyAmountChips } from './PrivacyAmountChips';
import type { SwapState, SourceToken, CommonAmountsResponse } from './types';
import { getChainEtaLabel } from './types';

interface SidebarProps {
  state: SwapState;
  recommendations?: CommonAmountsResponse | null;
  currentAmount?: string;
  onSelectAmount?: (amount: string) => void;
}

export function Sidebar({ state, recommendations, currentAmount, onSelectAmount }: SidebarProps) {
  const showFormTips = state.kind === 'form' || state.kind === 'quoting';
  const showChips =
    showFormTips &&
    recommendations &&
    recommendations.amounts.length > 0 &&
    onSelectAmount;

  return (
    <div className="space-y-3">
      {state.kind === 'connect' && <WhyConnectPanel />}
      {showFormTips && (
        state.mode === 'manual' ? (
          <>
            <HowToSendPanel chain={state.selectedToken.chainLabel} />
            {showChips && (
              <PrivacyAmountsPanel
                recommendations={recommendations}
                selectedToken={state.selectedToken}
                currentAmount={currentAmount}
                onSelectAmount={onSelectAmount}
              />
            )}
          </>
        ) : (
          <WalletInfoPanel
            recommendations={showChips ? recommendations : null}
            selectedToken={state.selectedToken}
            currentAmount={currentAmount}
            onSelectAmount={showChips ? onSelectAmount : undefined}
          />
        )
      )}
      {(state.kind === 'quote' || state.kind === 'waiting') && (
        <div className="hidden lg:block">
          <TimingPanel
            chain={state.selectedToken.chain}
            chainLabel={state.selectedToken.chainLabel}
            step={state.kind}
            txHash={state.kind === 'waiting' ? state.txHash : undefined}
          />
        </div>
      )}
      {state.kind === 'complete' && (
        <div className="surface-inset rounded-lg px-4 py-3.5">
          <p className="text-sm font-sans text-secondary leading-relaxed">
            Your ZEC has arrived. For maximum privacy, shield your balance using a wallet that supports Orchard.
          </p>
        </div>
      )}

      <SidebarFooterLink />
    </div>
  );
}

function SidebarFooterLink() {
  return (
    <a
      href="https://cipherscan.app/crosschain"
      className="surface-inset flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs font-sans text-secondary hover:text-cipher-cyan transition-colors"
    >
      <span>Crosschain analytics on CipherScan</span>
      <span aria-hidden className="text-muted shrink-0">
        ↗
      </span>
    </a>
  );
}

function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="surface-inset rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--color-border-subtle)]">
        <SectionLabel label={title} variant="plain" />
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function PrivacyAmountsPanel({
  recommendations,
  selectedToken,
  currentAmount,
  onSelectAmount,
}: {
  recommendations: CommonAmountsResponse;
  selectedToken: SourceToken;
  currentAmount?: string;
  onSelectAmount: (amount: string) => void;
}) {
  return (
    <PanelShell title="Pick an amount">
      <PrivacyAmountChips
        recommendations={recommendations}
        selectedToken={selectedToken}
        currentAmount={currentAmount}
        onSelect={onSelectAmount}
      />
    </PanelShell>
  );
}

function WhyConnectPanel() {
  return (
    <PanelShell title="Why connect">
      <ul className="space-y-3">
        {[
          { label: 'Multi-chain wallets', desc: 'Tap EVM or SOL (etc.) on the right for Phantom, TronLink, …' },
          { label: 'Filtered tokens', desc: 'Only see assets your wallet supports' },
          { label: 'Auto-fill addresses', desc: 'Refund address filled automatically' },
          { label: 'Card top-up (optional)', desc: 'After connecting, Buy with card via MoonPay may require ID' },
        ].map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cipher-cyan/60 mt-1.5 shrink-0" />
            <div>
              <div className="text-sm font-sans font-medium text-primary">{item.label}</div>
              <div className="text-xs font-sans text-secondary leading-relaxed">{item.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

function WalletInfoPanel({
  recommendations,
  selectedToken,
  currentAmount,
  onSelectAmount,
}: {
  recommendations: CommonAmountsResponse | null;
  selectedToken: SourceToken;
  currentAmount?: string;
  onSelectAmount?: (amount: string) => void;
}) {
  return (
    <PanelShell title="Privacy">
      <p className="text-sm font-sans text-secondary leading-relaxed">
        Use a unified (u1) address to receive into the Orchard shielded pool. Common amounts blend better with other shielded traffic.
      </p>
      {recommendations && onSelectAmount && (
        <div className="mt-4 pt-3.5 border-t border-[var(--color-border-subtle)]">
          <PrivacyAmountChips
            recommendations={recommendations}
            selectedToken={selectedToken}
            currentAmount={currentAmount}
            onSelect={onSelectAmount}
          />
        </div>
      )}
    </PanelShell>
  );
}

function HowToSendPanel({ chain }: { chain: string }) {
  return (
    <PanelShell title={`How to send on ${chain}`}>
      <p className="text-sm font-sans text-secondary leading-relaxed mb-3">
        Use any {chain} wallet that supports custom send addresses — exchange withdrawals work too.
      </p>
      <ol className="space-y-2">
        {[
          'Get a quote and confirm',
          'Copy the deposit address or scan the QR',
          'Send the exact amount from your wallet',
          'ZEC arrives at your address automatically',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-xs font-mono text-muted mt-0.5 shrink-0">{i + 1}.</span>
            <span className="text-xs font-sans text-secondary leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </PanelShell>
  );
}

function TimingPanel({
  chain,
  chainLabel,
  step,
  txHash,
}: {
  chain: string;
  chainLabel: string;
  step: string;
  txHash?: string;
}) {
  const estimate = getChainEtaLabel(chain);

  return (
    <PanelShell title="Estimated time">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full surface-inset flex items-center justify-center shrink-0">
          <TokenChainIcon token={chain} chain={chain} size={18} />
        </div>
        <div>
          <div className="text-sm font-mono font-semibold text-primary">{estimate}</div>
          <div className="text-xs font-sans text-secondary">via {chainLabel}</div>
        </div>
      </div>
      <div className="space-y-2.5">
        <StepDot active={step === 'waiting' && !txHash} done={!!txHash} label="Deposit to bridge address" />
        <StepDot active={step === 'waiting' && !!txHash} done={false} label="NEAR Intents bridging" />
        <StepDot active={false} done={false} label="ZEC sent to your address" />
      </div>
      <p className="text-xs font-sans text-muted leading-relaxed pt-3 mt-3 border-t border-[var(--color-border-subtle)]">
        Times depend on {chainLabel} block confirmations and NEAR solver availability.
      </p>
    </PanelShell>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
          done ? 'bg-cipher-cyan/70' : active ? 'bg-cipher-cyan motion-safe:animate-pulse' : 'bg-glass-12'
        }`}
      />
      <span className={`text-xs font-sans ${done || active ? 'text-secondary' : 'text-muted'}`}>{label}</span>
    </div>
  );
}
