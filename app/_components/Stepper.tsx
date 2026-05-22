'use client';

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div>
      {/* Mobile: segment progress */}
      <div
        className="flex gap-1 sm:hidden"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < current
                ? 'bg-cipher-cyan/40'
                : i === current
                  ? 'bg-cipher-cyan'
                  : 'bg-glass-12'
            }`}
          />
        ))}
      </div>

      {/* Desktop: labeled steps */}
      <div className="hidden sm:flex items-center gap-2" role="list" aria-label="Swap progress">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2" role="listitem">
            <div className="flex items-center gap-1.5" aria-current={i === current ? 'step' : undefined}>
              {i < current ? (
                <div
                  className="w-2 h-2 rounded-full border border-cipher-cyan/40 bg-cipher-cyan/10 flex items-center justify-center"
                  aria-hidden
                >
                  <svg className="w-1.5 h-1.5 text-cipher-cyan" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : i === current ? (
                <div
                  className="w-2 h-2 rounded-full bg-cipher-cyan motion-safe:animate-pulse"
                  aria-hidden
                />
              ) : (
                <div className="w-2 h-2 rounded-full border border-glass-12 bg-transparent" aria-hidden />
              )}
              <span
                className={`text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  i === current ? 'text-primary' : i < current ? 'text-secondary' : 'text-muted/50'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-muted/30 text-[10px] font-mono" aria-hidden>
                ›
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="sr-only">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
    </div>
  );
}
