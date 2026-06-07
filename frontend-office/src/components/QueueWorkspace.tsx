import { useEffect, useState } from 'react';
import { Ticket } from '@shared/types';
import TicketListRow from './TicketListRow';
import TicketDetailsPanel from './TicketDetailsPanel';
import ChatPanel from './ChatPanel';

interface Props {
  queueTickets: Ticket[];
  selected: Ticket | null;
  isDesktop: boolean;
  onSelect: (t: Ticket) => void;
  onUpdate: (t: Ticket) => void;
  onDeselect: () => void;
}

export default function QueueWorkspace({ queueTickets, selected, isDesktop, onSelect, onUpdate, onDeselect }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  // Auto-open chat when the selected ticket has an active conversation
  useEffect(() => {
    if (!selected) { setChatOpen(false); return; }
    const needsAttention = selected.status === 'query' || (selected.unread_count ?? 0) > 0;
    setChatOpen(needsAttention);
  }, [selected?.id, selected?.status, selected?.unread_count]);

  const showChat = isDesktop && !!selected && chatOpen;

  return (
    <div className={`h-full office-workspace${showChat ? ' with-chat' : ''}`}>
      <aside className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface-2)] h-full max-h-[36vh] lg:max-h-none">
        <p className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
          Queue · {queueTickets.length}
        </p>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          {queueTickets.map(t => (
            <TicketListRow key={t.id} ticket={t} active={selected?.id === t.id} onClick={() => onSelect(t)} />
          ))}
          {queueTickets.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-12">Nothing in this queue</p>
          )}
        </div>
      </aside>

      {isDesktop && selected ? (
        <>
          <section className="min-h-0 overflow-hidden hidden lg:block animate-panel-in bg-[var(--surface)]">
            <TicketDetailsPanel
              ticket={selected}
              onUpdate={onUpdate}
              onCompleted={onDeselect}
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen(o => !o)}
            />
          </section>
          {showChat && (
            <section className="min-h-0 overflow-hidden hidden lg:flex lg:flex-col border-l border-[var(--border)] bg-[var(--surface-2)] animate-panel-in">
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
                <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Messages</p>
                <button type="button" onClick={() => setChatOpen(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] text-xl leading-none"
                  title="Hide messages">×</button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel ticketId={selected.id} onTicketViewed={onUpdate} />
              </div>
            </section>
          )}
        </>
      ) : isDesktop ? (
        <div className="hidden lg:flex items-center justify-center text-[var(--muted)] text-sm bg-[var(--surface-2)]">
          Select a ticket from the queue
        </div>
      ) : (
        <div className="lg:hidden flex items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
          {queueTickets.length > 0 ? 'Tap a ticket to open it' : 'No tickets in this queue'}
        </div>
      )}
    </div>
  );
}
