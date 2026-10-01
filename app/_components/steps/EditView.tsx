'use client';

import type { RefObject } from 'react';
import { TokenChainIcon } from '@/components/TokenChainIcon';
import type { SwapState } from '@/hooks/useSwapMachine';
import type { QuoteResponse } from '@/lib/near-intents';
import { formatUsd, formatZec, fromSmallestUnit, isPositiveAmount, toSmallestUnit } from '@/lib/amount';
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
  buyWithCard: { show: boolean; loading: boolean; error: string | null; onOpen: () => void };
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
    onSetRefundAddr, onSetSlippage, onOpenWallet, onChooseManual, onUseWallet, onReview, buyWithCard,
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

  return (
    <div className="space-y-1">
      {/* You send */}
      <div className="panel px-4 pt-3 pb-3.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <label htmlFor="amount" className="text-secondary">You send</label>
          {sendMode === 'wallet' && (
            <div className="flex items-center gap-1.5 text-xs">
              {balanceLoading ? (
                <span className="text-muted animate-pulse">Reading balance…</span>
              ) : balance != null ? (
                <>
                  <span className="text-muted">Balance</span>
                  <span className="term text-secondary">{formatWalletBalance(balance)}</span>
                  {balanceNum! > 0 && (
                    <>
                      <button type="button" onClick={() => onSetAmount(fromSmallestUnit((toSmallestUnit(balance, t.decimals) ?? BigInt(0)) / BigInt(2), t.decimals))} className="ml-1 px-1.5 py-0.5 rounded-md text-cipher-gold hover:bg-cipher-gold/10 transition-colors">
                        Half
                      </button>
                      <button type="button" onClick={() => onSetAmount(balance)} className="px-1.5 py-0.5 rounded-md text-cipher-gold hover:bg-cipher-gold/10 transition-colors">
                        Max
                      </button>
                    </>
                  )}
                </>
              ) : null}
            </div>
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
            className="flex-1 min-w-0 bg-transparent text-primary font-mono text-[2.25rem] leading-none tracking-tight placeholder:text-muted/40 focus:outline-none tabular-nums"
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
        <div className="mt-1.5 h-4 term text-muted">{inUsd ? `≈ ${inUsd}` : ''}</div>
      </div>

      {recommendations && (
        <div className="py-1.5">
          <PrivacyAmountChips
            recommendations={recommendations}
            selectedToken={t}
            currentAmount={state.amount}
            onSelect={onSetAmount}
          />
        </div>
      )}

      {buyWithCard.show && (
        <div className="px-1 py-1 flex items-center justify-between gap-2">
          <button type="button" onClick={buyWithCard.onOpen} disabled={buyWithCard.loading} className="text-xs text-secondary hover:text-cipher-gold transition-colors disabled:opacity-50">
            {buyWithCard.loading ? 'Opening MoonPay…' : `No ${t.token}? Buy with card →`}
          </button>
          <span className="text-xs text-muted">MoonPay · requires ID (KYC)</span>
        </div>
      )}
      {buyWithCard.error && <p className="px-1 text-xs text-danger">{buyWithCard.error}</p>}

      {/* You receive */}
      <div className="panel px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-secondary">You receive</span>
          <span className="text-xs text-muted">Zcash</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 min-w-0 font-mono text-[2.25rem] leading-none tracking-tight tabular-nums truncate">
            {preview.loading && !q ? (
              <span className="inline-flex items-center gap-2 text-muted text-base font-sans"><Spinner /> Finding best route…</span>
            ) : q ? (
              <span className={preview.loading ? 'text-primary/60' : 'text-primary'}>{formatZec(q.amountOutFormatted)}</span>
            ) : (
              <span className="text-muted/40">0</span>
            )}
          </div>
          <span className="shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-md border border-glass-8">
            <TokenChainIcon token="zec" chain="zec" size={28} />
            <span className="text-base font-semibold text-primary">ZEC</span>
          </span>
        </div>
        <div className="mt-1.5 h-4 term text-muted">{q ? `≈ ${formatUsd(q.amountOutUsd)}` : ''}</div>
        {preview.error && !preview.loading && (
          <p role="alert" className="mt-2 text-sm text-cipher-orange">{preview.error}</p>
        )}
        <div className="mt-3 pt-3 border-t border-glass-4">
          <ZecAddressField value={state.zecAddress} onChange={onSetZecAddr} />
        </div>
      </div>

      {sendMode === 'manual' && (
        <div className="panel px-4 py-3 mt-1">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="refund" className="text-sm text-secondary">Refund address on {t.chainLabel}</label>
            <button type="button" onClick={onUseWallet} className="text-xs text-cipher-gold hover:underline">
              Use a wallet instead
            </button>
          </div>
          <input
            id="refund"
            type="text"
            value={state.refundAddress}
            onChange={(e) => onSetRefundAddr(e.target.value)}
            placeholder={`Your ${t.chainLabel} address`}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!!refundError}
            className="mt-2 w-full bg-transparent text-primary font-mono text-sm placeholder:font-sans placeholder:text-muted focus:outline-none"
          />
          <p className={`mt-1.5 text-xs ${refundError ? 'text-danger' : 'text-muted'}`}>
            {refundError ?? 'Refunds land here if the swap can’t complete. Use an address you control.'}
          </p>
        </div>
      )}

      <div className="pt-2">
        <PriceDetails
          quote={preview.data}
          token={t}
          zecAddress={state.zecAddress}
          slippageBps={state.slippageBps}
          onSetSlippage={onSetSlippage}
          loading={preview.loading}
        />
      </div>

      <div className="pt-2 space-y-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!action}
          onClick={() => (action === 'connect' ? onOpenWallet() : action === 'review' ? onReview() : undefined)}
        >
          {label}
        </button>
        {sendMode === 'choose' && (
          <button type="button" onClick={onChooseManual} className="w-full py-1.5 text-sm text-muted hover:text-primary transition-colors">
            or send manually from any wallet or exchange
          </button>
        )}
        {sendMode === 'wallet' && walletName && (
          <p className="text-center text-xs text-muted">
            Sending from {walletName} ·{' '}
            <button type="button" onClick={onChooseManual} className="hover:text-primary underline underline-offset-2">send manually</button>
          </p>
        )}
      </div>
    </div>
  );
}
