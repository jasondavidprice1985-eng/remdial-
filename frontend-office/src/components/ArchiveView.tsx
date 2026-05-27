import { useState } from 'react';
import { Ticket } from '@shared/types';
import TicketListRow from './TicketListRow';
import TicketDetailsPanel from './TicketDetailsPanel';
import ChatPanel from './ChatPanel';
import { sortQueueTickets } from '../utils/sortQueueTickets';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface Props {
  tickets: Ticket[];
  filterDev: string;
  filterSite: string;
  onFilterDev: (v: string) => void;
  onFilterSite: (v: string) => void;
}

export default function ArchiveView({ tickets, filterDev, filterSite, onFilterDev, onFilterSite }: Props) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const filtered = sortQueueTickets(tickets.filter(t => {
    const devMatch = !filterDev || t.developer.toLowerCase().includes(filterDev.toLowerCase());
    const siteMatch = !filterSite || t.site.toLowerCase().includes(filterSite.toLowerCase());
    return devMatch && siteMatch;
  }));

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex gap-2 shrink-0">
        <input className="input-field flex-1" placeholder="Filter by developer…" value={filterDev} onChange={e => onFilterDev(e.target.value)} />
        <input className="input-field flex-1" placeholder="Filter by site…" value={filterSite} onChange={e => onFilterSite(e.target.value)} />
      </div>
      <div className="flex-1 min-h-0 glass-panel overflow-hidden office-workspace">
        <aside className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] max-h-[40vh] lg:max-h-none">
          <p className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest border-b border-[var(--border)]">
            {filtered.length} archived
          </p>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {filtered.map(t => (
              <TicketListRow key={t.id} ticket={t} active={selected?.id === t.id} onClick={() => setSelected(t)} />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center py-16">No archived tickets</p>
            )}
          </div>
        </aside>
        {isDesktop && selected ? (
          <>
            <section className="min-h-0 overflow-hidden hidden lg:block">
              <TicketDetailsPanel ticket={selected} onUpdate={setSelected} />
            </section>
            <section className="min-h-0 hidden lg:flex lg:flex-col border-l border-[var(--border)]">
              <p className="px-3 py-2 text-xs font-semibold border-b border-[var(--border)] shrink-0">Messages</p>
              <div className="flex-1 min-h-0">
                <ChatPanel ticketId={selected.id} />
              </div>
            </section>
          </>
        ) : !isDesktop && !selected ? (
          <div className="lg:hidden p-8 text-center text-sm text-[var(--muted)]">Tap a ticket to view</div>
        ) : isDesktop ? (
          <div className="hidden lg:flex lg:col-span-2 items-center justify-center text-[var(--muted)] text-sm">Select a ticket</div>
        ) : null}
      </div>
      {selected && !isDesktop && (
        <div className="fixed inset-0 z-50 flex flex-col office-bg">
          <div className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] glass-panel shrink-0">
            <button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-[var(--pending)]">← List</button>
            <span className="font-mono font-bold text-sm">{selected.ref}</span>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <TicketDetailsPanel ticket={selected} onUpdate={setSelected} />
            </div>
            <div className="h-[45%] min-h-[240px] border-t border-[var(--border)] flex flex-col">
              <p className="px-3 py-2 text-xs font-semibold border-b border-[var(--border)] shrink-0">Messages</p>
              <div className="flex-1 min-h-0"><ChatPanel ticketId={selected.id} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
