import { Ticket } from '@shared/types';
import TicketDetailsPanel from './TicketDetailsPanel';
import ChatPanel from './ChatPanel';

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: (t: Ticket) => void;
}

export default function MobileTicketWorkView({ ticket, onClose, onUpdate }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col office-bg lg:hidden">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--pending)] shrink-0">← Queue</button>
        <span className="font-mono font-bold text-sm truncate">{ticket.ref}</span>
      </div>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <div className="flex-1 min-h-0 overflow-hidden md:border-r border-[var(--border)] bg-[var(--surface)]">
          <TicketDetailsPanel ticket={ticket} onUpdate={onUpdate} />
        </div>
        <div className="flex-1 min-h-[280px] md:min-h-0 overflow-hidden flex flex-col border-t md:border-t-0 border-[var(--border)] bg-[var(--surface-2)]">
          <p className="px-3 py-2 text-xs font-bold text-[var(--muted)] uppercase tracking-widest border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">Messages</p>
          <div className="flex-1 min-h-0">
            <ChatPanel ticketId={ticket.id} onTicketViewed={onUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}
