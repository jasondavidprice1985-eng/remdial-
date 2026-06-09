import { Ticket } from '@shared/types';
import StatusBadge from './StatusBadge';
import { itemsSummary } from '../utils/ticketDisplay';
import { isWaitingForOffice, ticketNeedsAttention } from '../utils/ticketAttention';

interface Props {
  ticket: Ticket;
  respondedQueries: Set<string>;
  onClick: () => void;
}

export default function TicketListCard({ ticket, respondedQueries, onClick }: Props) {
  const unread = ticket.unread_count ?? 0;
  const needsAction = ticketNeedsAttention(ticket, respondedQueries);
  const isQuery = ticket.status === 'query';
  const waiting = isWaitingForOffice(ticket, respondedQueries);
  const awaitingAcceptance = ticket.status === 'pending' && !ticket.accepted_at;

  let footNote: { text: string; tone: 'query' | 'pending' | 'subtle' } | null = null;
  if (isQuery && needsAction) footNote = { text: 'Office needs your reply', tone: 'query' };
  else if (waiting) footNote = { text: 'Reply sent — waiting for office', tone: 'subtle' };
  else if (!isQuery && unread > 0) footNote = { text: `New message${unread > 1 ? 's' : ''} from office`, tone: 'pending' };
  else if (awaitingAcceptance) footNote = { text: 'Awaiting admin to accept', tone: 'subtle' };

  const footColor =
    footNote?.tone === 'query' ? 'var(--query)' :
    footNote?.tone === 'pending' ? 'var(--pending)' :
    'var(--subtle)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left py-4 px-1 border-b border-[var(--border)] active:bg-[var(--surface-2)]"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="font-mono text-[12px] text-[var(--muted)] font-medium">{ticket.ref}</span>
        <StatusBadge status={ticket.status} ticket={ticket} />
      </div>

      <p className="text-[16px] font-semibold tracking-tight text-[var(--text)] leading-snug">
        {ticket.developer}
      </p>
      <p className="text-[13px] text-[var(--subtle)] mt-0.5">
        {ticket.site} · Plot {ticket.plot_number}
      </p>

      <div className="flex items-center justify-between gap-2 mt-2.5 text-[12px] text-[var(--faint)]">
        <span className="truncate">{itemsSummary(ticket)}</span>
        {ticket.status === 'ordered' && ticket.po_number ? (
          <span className="font-mono tabular-nums text-[var(--ordered)] shrink-0">PO {ticket.po_number}</span>
        ) : unread > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--query)] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--query)]" />
            {unread} new
          </span>
        ) : null}
      </div>

      {footNote && (
        <p className="text-[12px] mt-2" style={{ color: footColor }}>
          {footNote.text}
        </p>
      )}
    </button>
  );
}
