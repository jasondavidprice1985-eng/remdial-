import { useState, useMemo } from 'react';
import { Ticket } from '@shared/types';
import TicketListCard from './TicketListCard';
import TicketModal from './TicketModal';
import EmptyState from './EmptyState';
import { brand } from '@shared/brand';
import { sortTickets } from '../utils/sortTickets';
import { countNeedingAttention } from '../utils/ticketAttention';

interface Props {
  tickets: Ticket[];
  loading?: boolean;
  respondedQueries: Set<string>;
  onTicketUpdate: (ticket: Ticket) => void;
  onManagerResponded: (ticketId: string) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: 'reports' | 'archive';
}

export default function TicketList({
  tickets, loading, respondedQueries, onTicketUpdate, onManagerResponded,
  emptyTitle = 'No reports yet',
  emptySubtitle = `Tap ${brand.copy.newReport} below to submit your first report.`,
  emptyIcon = 'reports',
}: Props) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const sorted = useMemo(() => sortTickets(tickets, respondedQueries), [tickets, respondedQueries]);
  const needsAttention = countNeedingAttention(tickets, respondedQueries);

  if (loading) {
    return (
      <div className="px-4 space-y-3">
        <div className="skeleton h-6 w-48 mb-2" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 w-full" />)}
      </div>
    );
  }

  if (tickets.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <div className="px-4 space-y-3">
      {needsAttention > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium border border-red-200 bg-red-50 text-red-800">
          {needsAttention} report{needsAttention > 1 ? 's' : ''} need your reply
        </div>
      )}
      {sorted.map((ticket, i) => (
        <div key={ticket.id} className="stagger-in" style={{ animationDelay: `${i * 0.04}s` }}>
          <TicketListCard ticket={ticket} respondedQueries={respondedQueries}
            onClick={() => setSelected(ticket)} />
        </div>
      ))}
      {selected && (
        <TicketModal ticket={selected} onClose={() => setSelected(null)}
          onTicketUpdate={t => { onTicketUpdate(t); setSelected(t); }}
          onManagerResponded={() => onManagerResponded(selected.id)} />
      )}
    </div>
  );
}
