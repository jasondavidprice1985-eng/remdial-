import React from 'react';

interface Props {
  step?: number;
  eyebrow?: string;
  label: string;
  aux?: React.ReactNode;
  children: React.ReactNode;
}

export default function FormSection({ step, eyebrow, label, aux, children }: Props) {
  return (
    <section className="pt-7 pb-7 border-t border-[var(--border)] first:border-t-0 first:pt-2">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="text-[11px] text-[var(--faint)] tracking-[0.06em] uppercase tabular-nums">
          {step !== undefined && <span className="font-mono mr-1.5">{String(step).padStart(2, '0')}</span>}
          {eyebrow && <span>· {eyebrow}</span>}
        </div>
        {aux && <div className="text-[11.5px]">{aux}</div>}
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)] m-0 mb-4">
        {label}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function CompleteTag({ done, label }: { done?: boolean; label?: string }) {
  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--ordered)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ordered)]" />
        Complete
      </span>
    );
  }
  return <span className="text-[var(--faint)]">{label || 'Optional'}</span>;
}
