export type Queue = 'inbox' | 'pending' | 'query' | 'ordered';

const QUEUES: { id: Queue; label: string; dot: string }[] = [
  { id: 'inbox',   label: 'Inbox',    dot: 'var(--inbox)' },
  { id: 'pending', label: 'Accepted', dot: 'var(--pending)' },
  { id: 'query',   label: 'Query',    dot: 'var(--query)' },
  { id: 'ordered', label: 'Ordered',  dot: 'var(--ordered)' },
];

interface Props {
  active: Queue;
  counts: Record<Queue, number>;
  unread: Record<Queue, number>;
  onChange: (q: Queue) => void;
}

export default function QueueNav({ active, counts, unread, onChange }: Props) {
  return (
    <nav className="inline-flex items-center gap-6 shrink-0">
      {QUEUES.map(q => {
        const isActive = active === q.id;
        const msgs = unread[q.id];
        return (
          <button key={q.id} type="button" onClick={() => onChange(q.id)}
            className="relative flex items-center gap-2 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: isActive ? 'var(--text)' : 'var(--subtle)',
              borderBottom: isActive ? '1.5px solid var(--text)' : '1.5px solid transparent',
              marginBottom: '-1px',
            }}>
            <span className="inline-block w-[7px] h-[7px] rounded-full" style={{ background: q.dot }} />
            <span>{q.label}</span>
            <span className="tabular-nums" style={{ color: 'var(--faint)' }}>
              {counts[q.id]}
            </span>
            {msgs > 0 && (
              <span className="tabular-nums text-[11px]" style={{ color: 'var(--query)' }}>· {msgs}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export { QUEUES };
