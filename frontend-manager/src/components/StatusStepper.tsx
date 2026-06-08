import { Ticket } from '@shared/types';

const STEPS = [
  { key: 'logged',   label: 'Logged' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'ordered',  label: 'Ordered' },
  { key: 'fitted',   label: 'Complete' },
] as const;

function activeIndex(ticket: Ticket): number {
  if (ticket.status === 'archived') return 3;
  if (ticket.status === 'ordered') return 2;
  if (ticket.accepted_at) return 1;
  return 0;
}

export default function StatusStepper({ ticket }: { ticket: Ticket }) {
  const active = activeIndex(ticket);
  const isQuery = ticket.status === 'query';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const reached = i <= active;
          const isCurrent = i === active;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  reached
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-stone-100 text-[var(--muted)] border border-[var(--border)]'
                } ${isCurrent ? 'ring-2 ring-[var(--success)] ring-offset-2 ring-offset-white' : ''}`}>
                  {reached ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text-[10px] uppercase tracking-wider ${
                  reached ? 'text-[var(--text)] font-semibold' : 'text-[var(--muted)]'
                }`}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${
                  i < active ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {isQuery && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--danger)] flex items-center gap-1">
          ⚠ Office needs clarification
        </p>
      )}
    </div>
  );
}
