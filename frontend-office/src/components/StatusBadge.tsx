import { Ticket, TicketStatus } from '@shared/types';

const DOT: Record<TicketStatus | 'accepted', string> = {
  pending:  'var(--pending)',
  accepted: 'var(--pending)',
  query:    'var(--query)',
  ordered:  'var(--ordered)',
  archived: 'var(--border-strong)',
};

const LABELS: Record<TicketStatus | 'accepted', string> = {
  pending: 'Pending', accepted: 'Accepted', query: 'Query', ordered: 'Ordered', archived: 'Archived',
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
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text)] px-2.5 py-0.5 rounded-full border border-[var(--border)] tabular-nums">
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: DOT[effective] }} />
      {LABELS[effective]}
    </span>
  );
}
