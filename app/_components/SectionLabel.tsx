'use client';

interface SectionLabelProps {
  label: string;
  variant?: 'terminal' | 'plain';
}

export function SectionLabel({ label, variant = 'terminal' }: SectionLabelProps) {
  if (variant === 'plain') {
    return (
      <span className="text-xs font-sans font-medium text-secondary tracking-wide">
        {label}
      </span>
    );
  }

  return (
    <span className="text-[10px] font-mono text-muted tracking-wider uppercase">
      &gt; {label}
    </span>
  );
}
