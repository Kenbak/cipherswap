'use client';

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-2" role="list" aria-label="Swap progress">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2" role="listitem">
          <div className="flex items-center gap-1.5" aria-current={i === current ? 'step' : undefined}>
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < current
                  ? 'bg-cipher-green scale-100'
                  : i === current
                  ? 'bg-cipher-cyan animate-pulse scale-110'
                  : 'bg-glass-12 scale-100'
              }`}
            />
            <span
              className={`text-[10px] font-mono uppercase tracking-wider transition-colors ${
                i <= current ? 'text-secondary' : 'text-muted/50'
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-muted/30 text-[10px] font-mono" aria-hidden>›</span>
          )}
        </div>
      ))}
    </div>
  );
}
