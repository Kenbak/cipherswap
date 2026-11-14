'use client';

import type { RefObject } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SwapState } from '@/hooks/useSwapMachine';
import type { QuoteResponse } from '@/lib/near-intents';
import { formatUsd, formatZec, isPositiveAmount, toSmallestUnit } from '@/lib/amount';
import { TokenPicker } from '../TokenPicker';
import { ZecAddressField } from '../ZecAddressField';
import { PriceDetails } from '../PriceDetails';
import { PrivacyAmountChips } from '../PrivacyAmountChips';
import type { CommonAmountsResponse, SourceToken } from '../types';
import { formatWalletBalance, validateRefundAddress, validateZecAddress } from '../types';
import { Spinner } from '../ui';

export type SendMode = 'wallet' | 'manual' | 'choose';

interface EditViewProps {
  state: SwapState;
  amountRef: RefObject<HTMLInputElement | null>;
  tokens: SourceToken[];
  tokensLoading: boolean;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  sendMode: SendMode;
  walletConnected: boolean;
  walletName: string | null;
  balance: string | null;
  balanceLoading: boolean;
  preview: { data: QuoteResponse | null; loading: boolean; error: string | null };
  recommendations: CommonAmountsResponse | null;
  onSelectToken: (t: SourceToken) => void;
  onSetAmount: (v: string) => void;
  onSetZecAddr: (v: string) => void;
  onSetRefundAddr: (v: string) => void;
  onSetSlippage: (bps: number) => void;
  onOpenWallet: () => void;
  onChooseManual: () => void;
  onUseWallet: () => void;
  onReview: () => void;
}

function cta(p: EditViewProps): { label: string; action: 'review' | 'connect' | null } {
  const { state, sendMode, balance, preview } = p;
  const t = state.selectedToken;
  if (!state.amount || !isPositiveAmount(state.amount)) return { label: 'Enter an amount', action: null };
  const amount = toSmallestUnit(state.amount, t.decimals);
  if (!amount) return { label: `${t.token} supports ${t.decimals} decimals`, action: null };
  if (sendMode === 'wallet' && balance != null && amount > (toSmallestUnit(balance, t.decimals) ?? BigInt(0))) {
    return { label: `Not enough ${t.token}`, action: null };
  }
  if (preview.error && !preview.loading) return { label: 'No route for this amount', action: null };
  if (!state.zecAddress) return { label: 'Enter your ZEC address', action: null };
  if (validateZecAddress(state.zecAddress)) return { label: 'Check the ZEC address', action: null };
  if (sendMode === 'choose') return { label: p.walletConnected ? `Connect a ${t.chainLabel} wallet` : 'Connect wallet', action: 'connect' };
  if (sendMode === 'manual') {
    if (!state.refundAddress) return { label: 'Enter a refund address', action: null };
    if (validateRefundAddress(t.chain, state.refundAddress)) return { label: 'Check the refund address', action: null };
  }
  if (!preview.data) return { label: 'Getting price…', action: null };
  return { label: 'Review swap', action: 'review' };
}

export function EditView(props: EditViewProps) {
  const {
    state, amountRef, tokens, tokensLoading, pickerOpen, onPickerOpenChange, sendMode, walletName,
    balance, balanceLoading, preview, recommendations, onSelectToken, onSetAmount, onSetZecAddr,
    onSetRefundAddr, onSetSlippage, onOpenWallet, onChooseManual, onUseWallet, onReview,
  } = props;
  const t = state.selectedToken;
  const q = preview.data?.quote;
  const balanceNum = balance != null ? parseFloat(balance) : null;

  const inUsd = q
    ? formatUsd(q.amountInUsd)
    : t.priceUsd && isPositiveAmount(state.amount)
      ? formatUsd(parseFloat(state.amount) * t.priceUsd)
      : null;
  const refundError = state.refundAddress ? validateRefundAddress(t.chain, state.refundAddress) : null;
  const { label, action } = cta(props);

  const chipsShown = !!recommendations && !state.amount;
  const zecError = state.zecAddress ? validateZecAddress(state.zecAddress) : null;

  return (
    <div>
      {/* Pay */}
      <section className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2 h-5">
          <label htmlFor="amount" className="text-[0.8125rem] text-muted">You pay</label>
          {sendMode === 'wallet' && (
            balanceLoading ? (
              <span className="text-xs text-muted animate-pulse">Reading balance…</span>
            ) : balance != null ? (
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="tabular-nums">{formatWalletBalance(balance)} {t.token}</span>
                {balanceNum! > 0 && (
                  <button type="button" onClick={() => onSetAmount(balance)} className="font-medium text-cipher-gold hover:opacity-80">
                    Max
                  </button>
                )}
              </span>
            ) : null
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="amount"
            ref={amountRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={state.amount}
            onChange={(e) => {
              const v = e.target.value.replace(',', '.');
              if (v === '' || /^\d*\.?\d*$/.test(v)) onSetAmount(v);
            }}
            placeholder="0"
            className="flex-1 min-w-0 bg-transparent text-primary text-[2.5rem] font-medium leading-none tracking-tight placeholder:text-muted/30 focus:outline-none tabular-nums"
          />
          <TokenPicker
            tokens={tokens}
            selected={t}
            loading={tokensLoading}
            onSelect={onSelectToken}
            open={pickerOpen}
            onOpenChange={onPickerOpenChange}
          />
        </div>
        <div className="mt-2 h-4 text-[0.8125rem] text-muted tabular-nums">{inUsd ? `≈ ${inUsd}` : ''}</div>
        {chipsShown && (
          <div className="mt-3">
            <PrivacyAmountChips
              recommendations={recommendations!}
              selectedToken={t}
              currentAmount={state.amount}
              onSelect={onSetAmount}
            />
          </div>
        )}
      </section>

      {/* Receive */}
      <section className="relative px-5 pt-5 pb-5 border-t border-glass-6">
        <span
          className="absolute left-1/2 -top-3.5 -translate-x-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-surface-solid)] border border-glass-8 text-muted text-sm"
          aria-hidden
        >
          ↓
        </span>
        <div className="text-[0.8125rem] text-muted h-5">You get</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 min-w-0 text-[2.5rem] font-medium leading-none tracking-tight tabular-nums truncate">
            {preview.loading && !q ? (
              <span className="inline-flex items-center gap-2 text-muted text-base font-normal"><Spinner /> Finding a price…</span>
            ) : q ? (
              <span className={preview.loading ? 'text-primary/60' : 'text-primary'}>{formatZec(q.amountOutFormatted)}</span>
            ) : (
              <span className="text-muted/30">0</span>
            )}
          </div>
          <span className="shrink-0 flex items-center gap-2 pr-1">
            <TokenChainIcon token="zec" chain="zec" size={24} />
            <span className="text-base font-semibold text-primary">ZEC</span>
          </span>
        </div>
        <div className="mt-2 h-4 text-[0.8125rem] text-muted tabular-nums">{q ? `≈ ${formatUsd(q.amountOutUsd)}` : ''}</div>
        {preview.error && !preview.loading && (
          <p role="alert" className="mt-2 text-sm text-cipher-orange">{preview.error}</p>
        )}
      </section>

      {/* Destination */}
      <section className="px-5 py-3.5 border-t border-glass-6">
        <ZecAddressField value={state.zecAddress} onChange={onSetZecAddr} />
      </section>

      {sendMode === 'manual' && (
        <section className="px-5 py-3.5 border-t border-glass-6">
          <div className="flex items-center gap-3">
            <label htmlFor="refund" className="w-14 shrink-0 text-[0.8125rem] text-muted">Refund</label>
            <input
              id="refund"
              type="text"
              value={state.refundAddress}
              onChange={(e) => onSetRefundAddr(e.target.value)}
              placeholder={`Your ${t.chainLabel} address`}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!!refundError}
              aria-describedby="refund-hint"
              className="flex-1 min-w-0 bg-transparent text-primary font-mono text-base sm:text-sm placeholder:font-sans placeholder:text-muted/70 focus:outline-none"
            />
          </div>
          <p id="refund-hint" className={`mt-1.5 pl-[4.25rem] text-xs ${refundError ? 'text-danger' : 'text-muted'}`}>
            {refundError ?? 'Used only if the swap can’t complete.'}
          </p>
        </section>
      )}

      {q && !zecError && (
        <div className="border-t border-glass-6">
          <PriceDetails
            quote={preview.data}
            token={t}
            zecAddress={state.zecAddress}
            slippageBps={state.slippageBps}
            onSetSlippage={onSetSlippage}
            loading={preview.loading}
            flush
          />
        </div>
      )}

      <div className="px-5 pb-5 pt-1 space-y-3">
        <button
          type="button"
          className="btn-primary"
          disabled={!action}
          onClick={() => (action === 'connect' ? onOpenWallet() : action === 'review' ? onReview() : undefined)}
        >
          {label}
        </button>
        {sendMode === 'choose' && (
          <button type="button" onClick={onChooseManual} className="block mx-auto text-[0.8125rem] text-muted hover:text-primary transition-colors">
            Send manually instead
          </button>
        )}
        {sendMode === 'wallet' && walletName && (
          <button type="button" onClick={onChooseManual} className="block mx-auto text-[0.8125rem] text-muted hover:text-primary transition-colors">
            Send manually instead
          </button>
        )}
        {sendMode === 'manual' && (
          <button type="button" onClick={onUseWallet} className="block mx-auto text-[0.8125rem] text-muted hover:text-primary transition-colors">
            Use a wallet instead
          </button>
        )}
      </div>
    </div>
  );
}
