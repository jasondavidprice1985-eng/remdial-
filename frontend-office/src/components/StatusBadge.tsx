import { Ticket, TicketStatus } from '@shared/types';

const STYLES: Record<TicketStatus | 'accepted', string> = {
  pending:  'bg-blue-50 text-[var(--pending)] border border-blue-100',
  accepted: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  query:    'bg-red-50 text-[var(--query)] border border-red-100',
  ordered:  'bg-green-50 text-[var(--ordered)] border border-green-100',
  archived: 'bg-stone-100 text-[var(--muted)] border border-[var(--border)]',
};

const LABELS: Record<TicketStatus | 'accepted', string> = {
  pending: 'PENDING', accepted: 'ACCEPTED', query: 'QUERY', ordered: 'ORDERED', archived: 'ARCHIVED',
};

interface Props {
  status: TicketStatus;
  ticket?: Ticket;
}

export default function StatusBadge({ status, ticket }: Props) {
  const effective = ticket && status === 'pending' && ticket.accepted_at
    ? 'accepted'
    : status;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${STYLES[effective]}`}>
      {LABELS[effective]}
    </span>
  );
}
