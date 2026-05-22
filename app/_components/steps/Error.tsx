'use client';

interface ErrorProps {
  reason: string;
  hasRetry: boolean;
  refundAddress?: string;
  onRetry: () => void;
  onReset: () => void;
}

export function Error({ reason, hasRetry, refundAddress, onRetry, onReset }: ErrorProps) {
  const truncated = refundAddress
    ? `${refundAddress.slice(0, 8)}...${refundAddress.slice(-6)}`
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-lg bg-glass-2 border border-glass-4 p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-mono font-semibold text-primary mb-1">Swap Failed</h2>
            <p className="text-xs text-muted font-mono">{reason}</p>
          </div>
        </div>
      </div>

      {/* Refund reassurance */}
      <div className="rounded-lg bg-cipher-green/[0.04] border border-cipher-green/20 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-cipher-green mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-secondary leading-relaxed">
              If any funds were already deposited, NEAR Intents returns them automatically to your refund address.
            </p>
            {truncated && (
              <p className="mt-1.5 text-[11px] font-mono text-muted truncate">
                <span className="text-muted/60">Refund to: </span>
                <code className="text-cipher-green/80">{truncated}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onReset} className="flex-1 py-3 rounded-lg font-mono text-sm text-muted hover:text-secondary border border-glass-6 hover:border-glass-12 transition-all">
          New Swap
        </button>
        {hasRetry && (
          <button
            onClick={onRetry}
            className="flex-[2] btn-primary !w-auto"
          >
            Retry with same params
          </button>
        )}
      </div>
    </div>
  );
}
