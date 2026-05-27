import { TicketStatus } from '@shared/types';

const STYLES: Record<TicketStatus, string> = {
  pending:  'bg-blue-50 text-[var(--pending)] border border-blue-100',
  query:    'bg-red-50 text-[var(--query)] border border-red-100',
  ordered:  'bg-green-50 text-[var(--ordered)] border border-green-100',
  archived: 'bg-stone-100 text-[var(--muted)] border border-[var(--border)]',
};

const LABELS: Record<TicketStatus, string> = {
  pending: 'PENDING', query: 'QUERY', ordered: 'ORDERED', archived: 'ARCHIVED',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
