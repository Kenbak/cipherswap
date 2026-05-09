'use client';

import { TokenChainIcon } from '@/components/TokenChainIcon';
import { TokenPicker } from '../TokenPicker';
import { Stepper } from '../Stepper';
import { useZecPrice } from '../ZecPriceContext';
import type { SourceToken, CommonAmountsResponse, Mode } from '../types';
import { validateZecAddress, formatRecAmount, getBlendingLabel } from '../types';

interface FormProps {
  mode: Mode;
  amount: string;
  zecAddress: string;
  refundAddress: string;
  slippageBps: number;
  selectedToken: SourceToken;
  tokens: SourceToken[];
  tokensLoading: boolean;
  recommendations: CommonAmountsResponse | null;
  balance: string | null;
  previewZec: string;
  loading: boolean;
  error: string;
  walletAddress?: string | null;
  insufficientBalance: boolean;
  onSelectToken: (t: SourceToken) => void;
  onSetAmount: (v: string) => void;
  onSetZecAddr: (v: string) => void;
  onSetRefundAddr: (v: string) => void;
  onSetSlippage: (v: number) => void;
  onSubmit: () => void;
  onGoConnect: () => void;
  showSlippage: boolean;
  onToggleSlippage: () => void;
}

function ctaLabel(state: {
  loading: boolean; amount: string; zecAddress: string; refundAddress: string;
  mode: Mode; insufficientBalance: boolean;
}): string {
  if (state.loading) return 'Getting quote...';
  if (!state.amount) return 'Enter amount';
  if (state.insufficientBalance) return 'Insufficient balance';
  if (!state.zecAddress) return 'Enter ZEC address';
  const addrErr = validateZecAddress(state.zecAddress);
  if (addrErr) return 'Invalid ZEC address';
  if (!state.refundAddress) {
    return state.mode === 'wallet' ? 'Connect wallet to continue' : 'Enter your sending address';
  }
  return 'Get Quote';
}

export function Form({
  mode, amount, zecAddress, refundAddress, slippageBps, selectedToken,
  tokens, tokensLoading, recommendations, balance, previewZec, loading, error,
  walletAddress, insufficientBalance, onSelectToken, onSetAmount, onSetZecAddr,
  onSetRefundAddr, onSetSlippage, onSubmit, onGoConnect, showSlippage, onToggleSlippage,
}: FormProps) {
  const zecAddrError = validateZecAddress(zecAddress);
  const effectiveRefund = refundAddress || walletAddress || '';
  const ctaDisabled = loading || !amount || !zecAddress || !!zecAddrError || !effectiveRefund || insufficientBalance;
  const ctaText = ctaLabel({ loading, amount, zecAddress, refundAddress: effectiveRefund, mode, insufficientBalance });
  const { price: zecPrice } = useZecPrice();

  const stepIdx = !amount ? 0 : (!zecAddress || !effectiveRefund) ? 1 : 2;

  return (
    <div className="space-y-5">
      <Stepper steps={['Pick asset', 'Addresses', 'Get quote']} current={stepIdx} />

      {mode === 'manual' && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
          <span>Manual mode</span>
          <span className="text-muted/30">·</span>
          <button onClick={onGoConnect} className="text-cipher-cyan hover:underline">Connect instead?</button>
        </div>
      )}

      {/* Token picker */}
      <div>
        <label className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1.5 block">You send</label>
        <TokenPicker tokens={tokens} selected={selectedToken} loading={tokensLoading} onSelect={onSelectToken} />
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Amount</label>
          {mode === 'wallet' && balance && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-muted">
                {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedToken.token}
              </span>
              <button
                onClick={() => onSetAmount(String(parseFloat(balance) * 0.5))}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cipher-cyan bg-cipher-cyan/5 hover:bg-cipher-cyan/10 transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => onSetAmount(balance)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cipher-cyan bg-cipher-cyan/5 hover:bg-cipher-cyan/10 transition-colors"
              >
                MAX
              </button>
            </div>
          )}
        </div>
        <div className="flex rounded-lg bg-glass-3 border border-glass-6 focus-within:border-cipher-cyan/40 focus-within:shadow-[0_0_0_3px_rgb(var(--color-cyan-rgb)_/_0.06)] transition-all">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) onSetAmount(v);
            }}
            placeholder="0.00"
            className="flex-1 min-w-0 px-4 py-3 bg-transparent text-primary font-mono text-lg placeholder:text-muted/30 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-3 shrink-0">
            <TokenChainIcon token={selectedToken.token} chain={selectedToken.chain} size={16} />
            <span className="text-[11px] font-mono text-muted">{selectedToken.token}</span>
          </div>
        </div>

        {/* Live preview */}
        {previewZec && amount && (
          <p className="mt-1.5 text-[11px] font-mono text-secondary">
            ≈ {previewZec} ZEC
            {zecPrice ? <span className="text-muted ml-1.5">(≈ ${(parseFloat(previewZec) * zecPrice).toFixed(2)})</span> : null}
          </p>
        )}

        {/* Recommendation chips */}
        {recommendations && recommendations.amounts.length > 0 && (() => {
          const chips = recommendations.amounts
            .filter(a => a.sourceAmount && a.sourceAmount > 0)
            .filter(a => !a.sourceToken || a.sourceToken.toUpperCase() === selectedToken.token.toUpperCase())
            .slice(0, 4);
          if (chips.length === 0) return null;
          return (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-1 rounded-full bg-cipher-green" />
                <span className="text-[10px] font-mono text-muted leading-none">
                  Suggested amounts <span className="text-muted/60">— green blends best with recent shielded swaps</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
              {chips.map((rec, i) => {
                const label = getBlendingLabel(rec.blendingScore, rec.dualBlendScore);
                const token = rec.sourceToken || selectedToken.token;
                return (
                  <button
                    key={i}
                    onClick={() => onSetAmount(String(rec.sourceAmount))}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                      label === 'high'
                        ? 'border-cipher-green/30 text-cipher-green hover:bg-cipher-green/10'
                        : label === 'medium'
                        ? 'border-cipher-yellow/30 text-cipher-yellow hover:bg-cipher-yellow/10'
                        : 'border-glass-12 text-muted hover:bg-glass-6'
                    }`}
                    title={`≈${rec.amountZec} ZEC · ${rec.txCount} shielding txs · ${rec.chainSwapCount || 0} ${selectedToken.chain.toUpperCase()} swaps`}
                  >
                    {formatRecAmount(rec.sourceAmount!, token)} {token}
                  </button>
                );
              })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Swap arrow divider */}
      <div className="flex items-center gap-3 -my-1">
        <div className="flex-1 h-px bg-glass-4" />
        <div className="w-7 h-7 rounded-full bg-glass-4 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <div className="flex-1 h-px bg-glass-4" />
      </div>

      {/* ZEC address */}
      <div>
        <label className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1.5 block">
          Your ZEC address
        </label>
        <div className="flex rounded-lg bg-glass-3 border border-glass-6 focus-within:border-cipher-cyan/40 focus-within:shadow-[0_0_0_3px_rgb(var(--color-cyan-rgb)_/_0.06)] transition-all">
          <input
            type="text"
            value={zecAddress}
            onChange={(e) => onSetZecAddr(e.target.value)}
            placeholder="Paste t1 or u1 address"
            aria-describedby={zecAddress && zecAddrError ? 'zec-addr-error' : undefined}
            className="flex-1 min-w-0 px-4 py-3 bg-transparent text-primary font-mono text-sm placeholder:text-muted/30 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-3 shrink-0">
            <TokenChainIcon token="zec" chain="zec" size={16} />
            <span className="text-[11px] font-mono text-muted">ZEC</span>
          </div>
        </div>
        {zecAddress && zecAddrError && (
          <p id="zec-addr-error" className="mt-1 text-[11px] text-red-400 font-mono">{zecAddrError}</p>
        )}
      </div>

      {/* Refund / wallet info */}
      {mode === 'wallet' && walletAddress ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-cipher-green shrink-0" />
            <span className="truncate">Returns to {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} if swap fails</span>
          </div>
          <button onClick={onToggleSlippage} className="text-[11px] font-mono text-muted hover:text-secondary transition-colors shrink-0">
            {showSlippage ? 'Less' : 'More options'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-mono text-muted uppercase tracking-wider">
              Your {selectedToken.chainLabel} address
            </label>
            <button onClick={onToggleSlippage} className="text-[11px] font-mono text-muted hover:text-secondary transition-colors">
              {showSlippage ? 'Less' : 'More options'}
            </button>
          </div>
          <input
            type="text"
            value={refundAddress}
            onChange={(e) => onSetRefundAddr(e.target.value)}
            placeholder={`The address you're sending from`}
            className="w-full px-4 py-3 rounded-lg bg-glass-3 border border-glass-6 text-primary font-mono text-sm placeholder:text-muted/30 focus:outline-none focus:border-cipher-cyan/40 focus:shadow-[0_0_0_3px_rgb(var(--color-cyan-rgb)_/_0.06)] transition-all"
          />
          {!refundAddress && (
            <p className="mt-1.5 text-[11px] font-mono text-muted/70 leading-relaxed">
              Paste the {selectedToken.chainLabel} address you&apos;ll send from. Funds return here if the swap can&apos;t complete.
            </p>
          )}
        </div>
      )}

      {/* Slippage */}
      {showSlippage && (
        <div className="animate-fade-in">
          <label className="text-[10px] font-mono text-muted uppercase tracking-wider mb-2 block">Slippage</label>
          <div className="flex gap-1.5">
            {[{ label: '0.5%', value: 50 }, { label: '1%', value: 100 }, { label: '2%', value: 200 }].map(opt => (
              <button
                key={opt.value}
                onClick={() => onSetSlippage(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  slippageBps === opt.value
                    ? 'bg-cipher-cyan/10 text-cipher-cyan'
                    : 'text-muted hover:text-secondary bg-glass-2 hover:bg-glass-4'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {/* CTA */}
      <div className="sm:static sticky bottom-0 z-10 bg-[var(--color-surface-solid)] sm:bg-transparent pt-2 sm:pt-0 -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <button
          onClick={onSubmit}
          disabled={ctaDisabled}
          className="w-full py-3.5 rounded-lg font-mono font-semibold text-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-cipher-cyan-bright text-[#08090F] hover:shadow-[0_4px_20px_rgb(var(--color-cyan-rgb)_/_0.25)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-none"
        >
          {ctaText}
        </button>
      </div>

      <p className="text-center text-[10px] font-mono text-muted/60">
        Powered by NEAR Intents · Slippage: {slippageBps / 100}%
      </p>
    </div>
  );
}
