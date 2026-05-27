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

  return (
    <button type="button" onClick={onClick}
      className={`card p-4 w-full text-left relative ${needsAction ? 'animate-query-pulse border-red-200' : ''}`}>
      {unread > 0 && (
        <span
          title={`${unread} new message${unread > 1 ? 's' : ''} from office`}
          className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--danger)]">
          {unread}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono font-bold text-base text-[var(--ref)]">{ticket.ref}</p>
          <p className="text-base font-semibold mt-1.5 text-[var(--text)]">{ticket.site} — Plot {ticket.plot_number}</p>
          <p className="text-sm text-[var(--muted)] truncate mt-1">{itemsSummary(ticket)}</p>
          {awaitingAcceptance && (
            <p className="text-sm font-semibold text-[var(--muted)] mt-2">Awaiting admin to accept</p>
          )}
          {isQuery && needsAction && (
            <p className="text-sm font-semibold text-[var(--danger)] mt-2">⚠ Office needs your reply</p>
          )}
          {waiting && (
            <p className="text-sm font-semibold text-[var(--action)] mt-2">Reply sent — waiting for office</p>
          )}
          {!isQuery && unread > 0 && (
            <p className="text-sm font-semibold text-[var(--action)] mt-2">New message{unread > 1 ? 's' : ''} from office</p>
          )}
          {ticket.status === 'ordered' && ticket.po_number && (
            <p className="text-sm text-[var(--success)] mt-1">PO: {ticket.po_number}</p>
          )}
        </div>
        <StatusBadge status={ticket.status} />
      </div>
    </button>
  );
}
