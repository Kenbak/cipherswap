'use client';

import { TokenChainIcon } from '@/components/TokenChainIcon';
import { SwapSummary } from '../SwapSummary';
import { useZecPrice } from '../ZecPriceContext';
import type { SourceToken, Mode } from '../types';

interface QuoteProps {
  mode: Mode;
  amount: string;
  selectedToken: SourceToken;
  estimatedZec: string;
  slippageBps: number;
  zecAddress: string;
  timeLeft: number;
  progress: number;
  onBack: () => void;
  onConfirm: () => void;
  walletName?: string | null;
}

export function Quote({
  mode, amount, selectedToken, estimatedZec, slippageBps, zecAddress,
  timeLeft, progress, onBack, onConfirm, walletName,
}: QuoteProps) {
  const { price: zecPrice } = useZecPrice();
  const rate = parseFloat(amount) > 0 && parseFloat(estimatedZec) > 0
    ? (parseFloat(estimatedZec) / parseFloat(amount)).toFixed(6)
    : null;
  const minReceived = parseFloat(estimatedZec) > 0
    ? (parseFloat(estimatedZec) * (1 - slippageBps / 10000)).toFixed(4)
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Countdown progress bar */}
      {timeLeft > 0 && (
        <div className="w-full h-1 rounded-full bg-glass-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              timeLeft > 30 ? 'bg-cipher-green' : timeLeft > 10 ? 'bg-cipher-yellow' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, progress * 100)}%` }}
          />
        </div>
      )}

      <div className="rounded-lg bg-glass-2 border border-glass-4 p-5">
        <SwapSummary amount={amount} token={selectedToken} estimatedZec={estimatedZec} />

        {/* Detail rows */}
        <div className="border-t border-glass-4 pt-3 mt-4 space-y-1.5">
          {rate && (
            <div className="flex justify-between gap-3 text-xs font-mono">
              <span className="text-muted shrink-0">Rate</span>
              <span className="text-secondary text-right">
                1 {selectedToken.token} ≈ {rate} ZEC
                {zecPrice ? <span className="text-muted ml-1">(${(parseFloat(rate) * zecPrice).toFixed(2)})</span> : null}
              </span>
            </div>
          )}
          {minReceived && (
            <div className="flex justify-between gap-3 text-xs font-mono">
              <span className="text-muted shrink-0">Min received</span>
              <span className="text-secondary">{minReceived} ZEC</span>
            </div>
          )}
          <div className="flex justify-between gap-3 text-xs font-mono">
            <span className="text-muted shrink-0">Slippage</span>
            <span className="text-secondary">{slippageBps / 100}%</span>
          </div>
          <div className="flex justify-between gap-3 text-xs font-mono">
            <span
              className="text-muted underline decoration-dotted decoration-muted/40 underline-offset-2 cursor-help shrink-0"
              title="0.50% to CipherScan keeps the lights on. Network gas + bridge spread are quoted by NEAR Intents solvers and already priced into the rate above."
            >
              Service fee
            </span>
            <span className="text-secondary">0.50%</span>
          </div>
          <div className="flex justify-between gap-3 text-xs font-mono">
            <span className="text-muted shrink-0">Destination</span>
            <span className="text-secondary truncate">{zecAddress.slice(0, 10)}...{zecAddress.slice(-6)}</span>
          </div>
        </div>
      </div>

      {timeLeft > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <div className={`w-1.5 h-1.5 rounded-full ${timeLeft > 30 ? 'bg-cipher-green' : timeLeft > 10 ? 'bg-cipher-yellow' : 'bg-red-500 animate-pulse'}`} />
          <span className={timeLeft > 30 ? 'text-muted' : timeLeft > 10 ? 'text-cipher-yellow' : 'text-red-500'}>
            Quote expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-lg font-mono text-sm text-muted hover:text-secondary border border-glass-6 hover:border-glass-12 transition-all">
          Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-[2] py-3 rounded-lg font-mono font-semibold text-sm bg-cipher-green text-[#08090F] hover:shadow-[0_4px_20px_rgb(var(--color-green-rgb)_/_0.2)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
        >
          {mode === 'wallet' ? `Confirm & Send${walletName ? ` via ${walletName}` : ''}` : 'Confirm Swap'}
        </button>
      </div>
    </div>
  );
}
