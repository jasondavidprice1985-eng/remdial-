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
    <div className="space-y-3">
      <div className="flex items-center py-4 border-y border-[var(--border)]">
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          const reached = i <= active;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none gap-2.5">
              <span
                className="w-[8px] h-[8px] rounded-full shrink-0"
                style={{
                  background: reached ? 'var(--text)' : 'var(--border-strong)',
                  boxShadow: current ? '0 0 0 3px rgba(10,10,10,0.12)' : undefined,
                }}
              />
              <span className={`text-[12.5px] tracking-tight ${
                done ? 'text-[var(--text)]' : current ? 'text-[var(--text)] font-medium' : 'text-[var(--faint)]'
              }`}>{step.label}</span>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-[var(--border)] mx-2" />
              )}
            </div>
          );
        })}
      </div>
      {isQuery && (
        <p className="text-[12px] text-[var(--query)] inline-flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--query)]" />
          Awaiting clarification from manager
        </p>
      )}
    </div>
  );
}
