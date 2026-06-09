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
  pendingCount?: number;
  onTicketUpdate: (ticket: Ticket) => void;
  onManagerResponded: (ticketId: string) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: 'reports' | 'archive';
  heading?: string;
}

export default function TicketList({
  tickets, loading, respondedQueries, pendingCount = 0, onTicketUpdate, onManagerResponded,
  emptyTitle = 'No reports yet',
  emptySubtitle = `Tap ${brand.copy.newReport} below to submit your first report.`,
  emptyIcon = 'reports',
  heading = 'Your reports',
}: Props) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const sorted = useMemo(() => sortTickets(tickets, respondedQueries), [tickets, respondedQueries]);
  const needsAttention = countNeedingAttention(tickets, respondedQueries);

  if (loading) {
    return (
      <div className="px-5 pt-2 space-y-3">
        <div className="skeleton h-7 w-48 mb-2" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full rounded-md" />)}
      </div>
    );
  }

  if (tickets.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <div>
      {heading && (
        <div className="px-5 pt-1 pb-3">
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--text)] m-0">
            {heading}
          </h1>
          <p className="text-[13.5px] text-[var(--subtle)] mt-1 tabular-nums">
            {tickets.length} open
            {needsAttention > 0 && (
              <>
                {' · '}
                <span className="text-[var(--query)]">{needsAttention} need{needsAttention === 1 ? 's' : ''} your reply</span>
              </>
            )}
          </p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="mx-5 mb-3 px-3 py-2.5 text-[12.5px] border border-[var(--border)] rounded-md text-[var(--text)] bg-[var(--surface-2)] flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--inbox)] shrink-0" />
          <span>{pendingCount} report{pendingCount > 1 ? 's' : ''} saved offline — will sync when signal returns</span>
        </div>
      )}

      <div className="px-5">
        {sorted.map((ticket, i) => (
          <div key={ticket.id} className="stagger-in" style={{ animationDelay: `${i * 0.04}s` }}>
            <TicketListCard ticket={ticket} respondedQueries={respondedQueries}
              onClick={() => setSelected(ticket)} />
          </div>
        ))}
      </div>

      {selected && (
        <TicketModal ticket={selected} onClose={() => setSelected(null)}
          onTicketUpdate={t => { onTicketUpdate(t); setSelected(t); }}
          onManagerResponded={() => onManagerResponded(selected.id)} />
      )}
    </div>
  );
}
