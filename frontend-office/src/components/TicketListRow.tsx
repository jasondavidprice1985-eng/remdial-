import { Ticket } from '@shared/types';

interface Props {
  ticket: Ticket;
  active: boolean;
  onClick: () => void;
}

export default function TicketListRow({ ticket, active, onClick }: Props) {
  const unread = ticket.unread_count ?? 0;
  const isQuery = ticket.status === 'query';

  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all border text-sm ${
        isQuery && !active ? 'border-red-200' : ''
      } ${active ? 'border-[var(--pending)] bg-blue-50 shadow-sm' : 'border-transparent bg-[var(--surface)] hover:bg-[var(--surface-2)]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold text-[var(--ref)]">{ticket.ref}</span>
        {unread > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--pending)] text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </div>
      <p className="font-semibold mt-0.5 truncate text-[var(--text)]">{ticket.site} — Plot {ticket.plot_number}</p>
      <p className="text-[11px] text-[var(--muted)] truncate">{ticket.developer}</p>
      {isQuery && (
        <p className="text-[10px] text-[var(--query)] font-medium mt-1">Needs clarification</p>
      )}
    </button>
  );
}
