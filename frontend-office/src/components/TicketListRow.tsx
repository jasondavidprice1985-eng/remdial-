import { Ticket } from '@shared/types';
import { fmtDateUK } from '../utils/formatDate';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  query: 'Query',
  ordered: 'Ordered',
  inbox: 'Inbox',
  archived: 'Archived',
};

const STATUS_DOT: Record<string, string> = {
  pending: 'var(--pending)',
  query: 'var(--query)',
  ordered: 'var(--ordered)',
  inbox: 'var(--inbox)',
  archived: '#cbd5e1',
};

interface Props {
  ticket: Ticket;
  active: boolean;
  onClick: () => void;
}

export default function TicketListRow({ ticket, active, onClick }: Props) {
  const dot = STATUS_DOT[ticket.status] || 'var(--pending)';
  const statusLabel = STATUS_LABEL[ticket.status] || 'Pending';
  const unread = ticket.unread_count ?? 0;
  const createdDate = new Date(ticket.created_at);
  const today = new Date();
  const isToday = createdDate.toDateString() === today.toDateString();
  const timeStr = isToday ? createdDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : fmtDateUK(ticket.created_at);

  return (
    <button type="button" onClick={onClick}
      className="w-full px-4 py-3 border-b border-[var(--border)] transition-colors bg-[var(--surface)]"
      style={{
        background: active ? 'var(--surface-2)' : 'var(--surface)',
      }}>
      <div className="grid gap-3 items-center" style={{
        gridTemplateColumns: '88px 1.4fr 1fr 110px 160px 36px',
      }}>
        {/* Ref */}
        <div className="min-w-0">
          <span className="font-mono text-[11px] font-medium text-[var(--muted)] block truncate">{ticket.ref}</span>
        </div>

        {/* Developer + site/plot */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text)] truncate leading-tight">
            {ticket.developer}
          </p>
          <p className="text-[11.5px] text-[var(--subtle)] truncate mt-0.5">
            {ticket.site} · Plot {ticket.plot_number}
          </p>
        </div>

        {/* Unread count */}
        <div className="text-right">
          {unread > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--query)]">
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--query)]" />
              {unread} new
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: dot }} />
          <span className="text-[11.5px] text-[var(--text)] font-medium">{statusLabel}</span>
        </div>

        {/* Time */}
        <div className="text-right">
          <span className="text-[11.5px] text-[var(--subtle)] font-mono tabular-nums">{timeStr}</span>
        </div>

        {/* Chevron */}
        <div className="flex items-center justify-end">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--faint)]">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
}
