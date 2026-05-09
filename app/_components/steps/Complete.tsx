'use client';

interface CompleteProps {
  estimatedZec: string;
  onReset: () => void;
}

export function Complete({ estimatedZec, onReset }: CompleteProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-lg bg-glass-2 border border-glass-4 p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cipher-green/10 border border-cipher-green/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-cipher-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-mono font-semibold text-primary mb-1">Swap Complete</h2>
            <p className="text-xs text-muted font-mono">{estimatedZec} ZEC sent to your address</p>
          </div>
        </div>
      </div>
      <button onClick={onReset} className="w-full py-3 rounded-lg font-mono text-sm text-muted hover:text-secondary border border-glass-6 hover:border-glass-12 transition-all">
        New Swap
      </button>
    </div>
  );
}
