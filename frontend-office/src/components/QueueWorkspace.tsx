import { useEffect, useState, useMemo } from 'react';
import { Ticket } from '@shared/types';
import TicketListRow from './TicketListRow';
import TicketDetailsPanel from './TicketDetailsPanel';
import ChatPanel from './ChatPanel';
import { groupTicketsByDay } from '../utils/groupTicketsByDay';

interface Props {
  queueTickets: Ticket[];
  selected: Ticket | null;
  onSelect: (t: Ticket) => void;
  onUpdate: (t: Ticket) => void;
  onDeselect: () => void;
}

export default function QueueWorkspace({ queueTickets, selected, onSelect, onUpdate, onDeselect }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!selected) { setChatOpen(false); return; }
    const needsAttention = selected.status === 'query' || (selected.unread_count ?? 0) > 0;
    setChatOpen(needsAttention);
  }, [selected?.id, selected?.status, selected?.unread_count]);

  const showChat = !!selected && chatOpen;
  const dayGroups = useMemo(() => groupTicketsByDay(queueTickets), [queueTickets]);

  return (
    <div className="h-full office-workspace">
      <aside className="flex flex-col min-h-0 border-r border-[var(--border)] bg-[var(--surface)] h-full">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <p className="text-[10.5px] font-medium text-[var(--faint)] uppercase tracking-[0.06em]">
            {queueTickets.length} in queue
          </p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {dayGroups.length > 0 ? (
            dayGroups.map((group, gi) => (
              <div key={group.label}>
                <div className="px-4 pt-3 pb-1.5 text-[11.5px] font-medium text-[var(--subtle)]">
                  {group.label}
                </div>
                {group.tickets.map(t => (
                  <TicketListRow key={t.id} ticket={t} active={selected?.id === t.id} onClick={() => onSelect(t)} />
                ))}
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--faint)] text-center py-12">Nothing in this queue</p>
          )}
        </div>
      </aside>

      {selected ? (
        <section className="min-h-0 overflow-hidden animate-panel-in bg-[var(--surface)]">
          <TicketDetailsPanel
            ticket={selected}
            onUpdate={onUpdate}
            onCompleted={onDeselect}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen(o => !o)}
          />
        </section>
      ) : (
        <div className="flex items-center justify-center text-[var(--faint)] text-sm bg-[var(--surface)]">
          Select a ticket from the queue
        </div>
      )}

      {/* Chat slide-over */}
      {showChat && selected && (
        <>
          <button
            type="button"
            aria-label="Close messages"
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-transparent z-30"
          />
          <aside
            className="flex flex-col fixed top-0 right-0 bottom-0 w-[440px] bg-[var(--surface)] border-l border-[var(--border)] z-40 animate-panel-in"
            style={{ boxShadow: '-24px 0 48px -16px rgba(10,10,10,0.06)' }}
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Messages</div>
                <div className="text-[11.5px] text-[var(--faint)] mt-0.5">
                  {selected.ref} · {selected.developer} · Plot {selected.plot_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-md grid place-items-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatPanel ticketId={selected.id} onTicketViewed={onUpdate} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
