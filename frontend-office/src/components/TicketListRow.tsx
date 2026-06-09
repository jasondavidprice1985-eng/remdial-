import { Ticket } from '@shared/types';

const STATUS_DOT: Record<string, string> = {
  pending: 'var(--pending)',
  query: 'var(--query)',
  ordered: 'var(--ordered)',
  inbox: 'var(--inbox)',
  archived: 'var(--border-strong)',
};

interface Props {
  ticket: Ticket;
  active: boolean;
  onClick: () => void;
}

export default function TicketListRow({ ticket, active, onClick }: Props) {
  const unread = ticket.unread_count ?? 0;
  const dot = STATUS_DOT[ticket.status] || 'var(--pending)';

  return (
    <button type="button" onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b border-[var(--border)] transition-colors relative group"
      style={{
        background: active ? 'var(--surface-2)' : 'transparent',
      }}>
      {active && (
        <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-[2px] bg-[var(--text)]" />
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-[11px] font-medium text-[var(--muted)]">{ticket.ref}</span>
        {unread > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--query)]">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--query)]" />
            {unread} new
          </span>
        )}
      </div>
      <p className="text-[14px] font-semibold text-[var(--text)] truncate leading-tight tracking-tight">
        {ticket.developer}
      </p>
      <p className="text-[12.5px] text-[var(--subtle)] truncate mt-0.5">
        {ticket.site} · Plot {ticket.plot_number}
      </p>
      <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[var(--faint)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: dot }} />
          <span className="capitalize">{ticket.status === 'pending' ? 'Pending' : ticket.status}</span>
        </span>
      </div>
    </button>
  );
}
