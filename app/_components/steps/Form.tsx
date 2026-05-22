'use client';

import { useState, useEffect } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import { TokenPicker } from '../TokenPicker';
import { Stepper } from '../Stepper';
import { useZecPrice } from '../ZecPriceContext';
import type { SourceToken, Mode } from '../types';
import { formatWalletBalance, validateZecAddress } from '../types';

interface FormProps {
  mode: Mode;
  amount: string;
  zecAddress: string;
  refundAddress: string;
  slippageBps: number;
  selectedToken: SourceToken;
  tokens: SourceToken[];
  tokensLoading: boolean;
  balance: string | null;
  balanceLoading?: boolean;
  previewZec: string;
  previewLoading?: boolean;
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
  showBuyWithCard?: boolean;
  onBuyWithCard?: () => void;
  buyWithCardLoading?: boolean;
  buyWithCardError?: string | null;
}

/** Step advances to "receive" only after the user engages the ZEC field — not when amount is typed. */
function getFormStepIndex(
  amount: string,
  zecAddress: string,
  effectiveRefund: string,
  addressEngaged: boolean,
): number {
  const hasValidAmount = !!(amount && parseFloat(amount) > 0);
  const zecErr = validateZecAddress(zecAddress);
  const hasValidZec = !!(zecAddress && !zecErr);

  if (!hasValidAmount) return 0;
  if (hasValidZec && effectiveRefund) return 2;
  if (addressEngaged || zecAddress.length > 0) return 1;
  return 0;
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

function SwapOptionsBar({
  mode,
  walletAddress,
  refundAddress,
  selectedToken,
  slippageBps,
  showSlippage,
  onToggleSlippage,
  onSetRefundAddr,
  onSetSlippage,
}: {
  mode: Mode;
  walletAddress?: string | null;
  refundAddress: string;
  selectedToken: SourceToken;
  slippageBps: number;
  showSlippage: boolean;
  onToggleSlippage: () => void;
  onSetRefundAddr: (v: string) => void;
  onSetSlippage: (v: number) => void;
}) {
  const shortRefund =
    walletAddress
      ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
      : refundAddress
        ? `${refundAddress.slice(0, 6)}…${refundAddress.slice(-4)}`
        : null;

  return (
    <div className="surface-inset rounded-lg overflow-hidden text-xs font-sans">
      {mode === 'manual' && (
        <div className="px-3 py-2.5 border-b border-[var(--color-border-subtle)]">
          <label className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1 block">
            Refund address ({selectedToken.chainLabel})
          </label>
          <input
            type="text"
            value={refundAddress}
            onChange={(e) => onSetRefundAddr(e.target.value)}
            placeholder="Address you're sending from"
            className="input-shell w-full px-3 py-2 text-primary font-mono text-sm placeholder:text-muted/40 focus:outline-none"
          />
        </div>
      )}

      <div className="px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        {mode === 'wallet' && shortRefund && (
          <>
            <span className="text-secondary">
              Refund <span className="font-mono text-primary">{shortRefund}</span>
            </span>
            <span aria-hidden>·</span>
          </>
        )}
        <span>
          Slippage <span className="font-mono text-secondary">{slippageBps / 100}%</span>
        </span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={onToggleSlippage}
          className="text-cipher-cyan hover:text-cipher-cyan/80 transition-colors"
        >
          {showSlippage ? 'Done' : 'Adjust'}
        </button>
      </div>

      {showSlippage && (
        <div className="px-3 pb-2.5 flex gap-1.5 border-t border-[var(--color-border-subtle)] pt-2">
          {[{ label: '0.5%', value: 50 }, { label: '1%', value: 100 }, { label: '2%', value: 200 }].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSetSlippage(opt.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                slippageBps === opt.value
                  ? 'bg-cipher-cyan/15 text-cipher-cyan border border-cipher-cyan/30'
                  : 'text-muted hover:text-secondary border border-[var(--color-border-subtle)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Form({
  mode, amount, zecAddress, refundAddress, slippageBps, selectedToken,
  tokens, tokensLoading, balance, balanceLoading, previewZec, previewLoading, loading, error,
  walletAddress, insufficientBalance, onSelectToken, onSetAmount, onSetZecAddr,
  onSetRefundAddr, onSetSlippage, onSubmit, onGoConnect, showSlippage, onToggleSlippage,
  showBuyWithCard, onBuyWithCard, buyWithCardLoading, buyWithCardError,
}: FormProps) {
  const zecAddrError = validateZecAddress(zecAddress);
  const effectiveRefund = refundAddress || walletAddress || '';
  const ctaDisabled = loading || !amount || !zecAddress || !!zecAddrError || !effectiveRefund || insufficientBalance;
  const ctaText = ctaLabel({ loading, amount, zecAddress, refundAddress: effectiveRefund, mode, insufficientBalance });
  const { price: zecPrice } = useZecPrice();

  const [addressEngaged, setAddressEngaged] = useState(false);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) setAddressEngaged(false);
  }, [amount]);

  const stepIdx = getFormStepIndex(amount, zecAddress, effectiveRefund, addressEngaged);
  const balanceNum = balance != null ? parseFloat(balance) : null;
  const hasValidAmount = !!(amount && parseFloat(amount) > 0);
  const zeroBalance = balanceNum === 0;
  const showCardPromo = !!(showBuyWithCard && onBuyWithCard && mode === 'wallet' && !balanceLoading && zeroBalance);
  const showCardInline = !!(showBuyWithCard && onBuyWithCard && !showCardPromo);

  const receiveZec = previewZec && amount ? previewZec : null;
  const receiveUsd =
    receiveZec && zecPrice ? (parseFloat(receiveZec) * zecPrice).toFixed(2) : null;

  return (
    <div className="space-y-3.5">
      <Stepper steps={['Send', 'Receive', 'Quote']} current={stepIdx} />

      {mode === 'manual' && (
        <div className="flex items-center gap-2 text-xs font-sans text-muted">
          <span>Manual mode</span>
          <span className="text-muted/30">·</span>
          <button type="button" onClick={onGoConnect} className="text-cipher-cyan hover:underline">
            Connect instead?
          </button>
        </div>
      )}

      {/* You send — token + amount (Uniswap-style) */}
      <div className="input-shell overflow-visible">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider">You send</span>
          <div className="flex items-center gap-1.5">
            {mode === 'wallet' && balanceLoading && (
              <span className="text-[10px] font-mono text-muted animate-pulse">Balance…</span>
            )}
            {mode === 'wallet' && !balanceLoading && balance != null && (
              <>
                <span className="text-[10px] font-mono text-secondary">
                  {formatWalletBalance(balance!)}
                </span>
                {balanceNum! > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetAmount(String(balanceNum! * 0.5))}
                      className="px-1 py-0.5 rounded text-[10px] font-mono text-muted hover:text-primary transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetAmount(balance!)}
                      className="px-1 py-0.5 rounded text-[10px] font-mono text-muted hover:text-primary transition-colors"
                    >
                      MAX
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-stretch min-h-[52px]">
          <TokenPicker
            variant="inline"
            tokens={tokens}
            selected={selectedToken}
            loading={tokensLoading}
            onSelect={onSelectToken}
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) onSetAmount(v);
            }}
            placeholder="0"
            className="flex-1 min-w-0 px-3 py-2 bg-transparent text-primary font-mono text-xl text-right placeholder:text-muted/30 focus:outline-none"
          />
        </div>
      </div>

      {(showCardPromo || showCardInline || buyWithCardError) && (
        <div className="space-y-1.5 -mt-1">
          {showCardPromo && (
            <button
              type="button"
              onClick={onBuyWithCard}
              disabled={buyWithCardLoading}
              className="w-full py-2 rounded-lg text-[11px] font-mono border border-cipher-cyan/30 text-cipher-cyan hover:bg-cipher-cyan/10 transition-colors disabled:opacity-50"
            >
              {buyWithCardLoading ? 'Opening MoonPay…' : `Buy ${selectedToken.token} with card`}
            </button>
          )}
          {showCardInline && (
            <button
              type="button"
              onClick={onBuyWithCard}
              disabled={buyWithCardLoading}
              className="text-[11px] font-sans text-muted hover:text-cipher-cyan transition-colors disabled:opacity-50"
            >
              {buyWithCardLoading ? 'Opening…' : 'Buy with card →'}
            </button>
          )}
          {buyWithCardError && (
            <p className="text-[11px] font-mono text-red-400">{buyWithCardError}</p>
          )}
        </div>
      )}

      {/* Arrow */}
      <div className="flex justify-center -my-1.5">
        <div className="w-6 h-6 rounded-full surface-inset flex items-center justify-center">
          <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* You receive + ZEC address */}
      <div className="input-shell">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-1.5 min-w-0">
            <TokenChainIcon token="zec" chain="zec" size={18} />
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider">You receive</span>
          </div>
          <div className="text-right shrink-0 min-h-[2.25rem] flex flex-col items-end justify-center">
            {previewLoading && hasValidAmount ? (
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  className="w-3 h-3 rounded-full border-2 border-glass-12 border-t-cipher-cyan animate-spin"
                  aria-hidden
                />
                <span className="text-[11px] font-mono">Estimating…</span>
              </span>
            ) : (
              <>
                <span
                  className={`font-mono font-semibold tabular-nums text-sm ${
                    receiveZec ? 'text-primary' : 'text-muted/40'
                  }`}
                >
                  {receiveZec ? `≈ ${receiveZec} ZEC` : '— ZEC'}
                </span>
                {receiveUsd && (
                  <span className="block text-[10px] font-mono text-muted">≈ ${receiveUsd}</span>
                )}
              </>
            )}
          </div>
        </div>
        <input
          type="text"
          value={zecAddress}
          onChange={(e) => {
            setAddressEngaged(true);
            onSetZecAddr(e.target.value);
          }}
          onFocus={() => setAddressEngaged(true)}
          placeholder="ZEC address (t1 or u1)"
          aria-describedby={zecAddress && zecAddrError ? 'zec-addr-error' : undefined}
          className="w-full px-3 py-2.5 bg-transparent text-primary font-mono text-sm placeholder:text-muted/40 focus:outline-none"
        />
        {zecAddress && zecAddrError && (
          <p id="zec-addr-error" className="px-3 pb-2 text-[11px] text-red-400 font-mono -mt-1">
            {zecAddrError}
          </p>
        )}
      </div>

      <SwapOptionsBar
        mode={mode}
        walletAddress={walletAddress}
        refundAddress={refundAddress}
        selectedToken={selectedToken}
        slippageBps={slippageBps}
        showSlippage={showSlippage}
        onToggleSlippage={onToggleSlippage}
        onSetRefundAddr={onSetRefundAddr}
        onSetSlippage={onSetSlippage}
      />

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      <div className="sm:static sticky bottom-0 z-10 surface-solid sm:!bg-transparent sm:!border-0 -mx-4 px-4 sm:mx-0 sm:px-0 pt-1.5 sm:pt-0 pb-2 sm:pb-0">
        <button type="button" onClick={onSubmit} disabled={ctaDisabled} className="btn-primary">
          {ctaText}
        </button>
      </div>

      <p className="text-center text-[10px] font-sans text-muted -mt-1">
        Powered by NEAR Intents
      </p>
    </div>
  );
}
