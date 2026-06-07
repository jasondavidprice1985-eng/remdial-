export type Queue = 'inbox' | 'pending' | 'query' | 'ordered';

const QUEUES: { id: Queue; label: string; accent: string }[] = [
  { id: 'inbox',   label: 'Inbox',    accent: '#7c3aed' },
  { id: 'pending', label: 'Accepted', accent: 'var(--pending)' },
  { id: 'query',   label: 'Query',    accent: 'var(--query)' },
  { id: 'ordered', label: 'Ordered',  accent: 'var(--ordered)' },
];

interface Props {
  active: Queue;
  counts: Record<Queue, number>;
  unread: Record<Queue, number>;
  onChange: (q: Queue) => void;
}

export default function QueueNav({ active, counts, unread, onChange }: Props) {
  return (
    <nav className="inline-flex gap-1 p-1 rounded-lg shrink-0 bg-[var(--surface-2)] border border-[var(--border)]">
      {QUEUES.map(q => {
        const isActive = active === q.id;
        const msgs = unread[q.id];
        return (
          <button key={q.id} type="button" onClick={() => onChange(q.id)}
            className="relative px-4 py-2 rounded-md text-xs font-semibold transition-all min-w-[7rem]"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? q.accent : 'var(--muted)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
            }}>
            {q.label}
            <span className={`ml-1.5 tabular-nums font-bold ${counts[q.id] === 0 && !isActive ? 'text-stone-300' : ''}`}>
              {counts[q.id]}
            </span>
            {msgs > 0 && (
              <span className="ml-1 text-[10px] font-bold" style={{ color: q.accent }}>· {msgs}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export { QUEUES };
