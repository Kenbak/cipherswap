'use client';

export function SectionLabel({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono text-muted tracking-wider uppercase">
      &gt; {label}
    </span>
  );
}
