import { useRef, useState } from 'react';
import { OrderedLineItem, Ticket } from '@shared/types';
import StatusBadge from './StatusBadge';
import StatusStepper from './StatusStepper';
import ChatPanel from './ChatPanel';
import ImageLightbox, { useLightbox } from './ImageLightbox';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import { LineItemsList, ImageStrip } from '../utils/ticketDisplay';
import { apiFetch } from '../auth/apiClient';

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onTicketUpdate: (ticket: Ticket) => void;
  onManagerResponded: () => void;
}

export default function TicketModal({ ticket, onClose, onTicketUpdate, onManagerResponded }: Props) {
  const lightbox = useLightbox();
  const swipe = useSwipeToClose(onClose);
  const [archiving, setArchiving] = useState(false);
  const [chatDraft, setChatDraft] = useState<string | undefined>(undefined);
  const [draftToken, setDraftToken] = useState(0);
  const chatAnchorRef = useRef<HTMLDivElement>(null);
  const isArchived = ticket.status === 'archived';
  const [locked, setLocked] = useState(isArchived);

  function tryUnlock() {
    if (window.confirm('This ticket is archived. Unlock for editing?')) {
      setLocked(false);
    }
  }

  async function confirmOrder() {
    if (archiving) return;
    if (!window.confirm('Confirm the SAP order is correct? The ticket will close.')) return;
    setArchiving(true);
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/archive`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onClose();
    } catch {
      setArchiving(false);
      window.alert('Could not confirm order. Please try again.');
    }
  }

  async function queryItem(item: OrderedLineItem) {
    // Move ticket into 'query' state if it isn't already, then pre-fill chat with context.
    if (ticket.status !== 'query') {
      try {
        await apiFetch(`/tickets/${ticket.id}/query`, { method: 'PATCH' });
      } catch { /* server will validate; UI continues */ }
    }
    const codePart = item.sap_code ? ` [${item.sap_code}]` : '';
    setChatDraft(`Re: ${item.description}${codePart} (x${item.quantity}) — `);
    setDraftToken(t => t + 1);
    setTimeout(() => chatAnchorRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  const delivery = ticket.delivery_request?.type === 'specific_date'
    ? ticket.delivery_request.date : 'Next delivery';
  const hasOrdered = ticket.status === 'ordered' && Array.isArray(ticket.ordered_items) && ticket.ordered_items.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-40 animate-slide-up flex flex-col bg-[var(--bg)]" {...swipe}>
        <div className="flex items-center justify-between px-4 py-3 glass border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-base text-[var(--ref)]">{ticket.ref}</span>
            <StatusBadge status={ticket.status} ticket={ticket} />
            {ticket.status === 'pending' && !ticket.accepted_at && (
              <span className="text-[10px] font-semibold text-[var(--muted)] bg-stone-100 px-2 py-0.5 rounded-full">Awaiting acceptance</span>
            )}
          </div>
          <button onClick={onClose}
            className="flex items-center gap-1.5 h-11 px-4 rounded-full bg-stone-100 text-[var(--text)] font-semibold text-sm shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isArchived && locked && (
            <div className="mx-4 mt-4 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2.5 text-[12.5px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--subtle)] shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="flex-1 text-[var(--text)]">Archived — view only</span>
              <button type="button" onClick={tryUnlock}
                className="text-[12px] font-semibold text-[var(--ordered)] border-b border-[var(--ordered)]/40 hover:border-[var(--ordered)]">
                Unlock
              </button>
            </div>
          )}
          <div className="p-4 space-y-4">
            <StatusStepper ticket={ticket} />
            <div className="card p-4 space-y-2 text-sm">
              {[
                ['Developer', ticket.developer], ['Site', ticket.site],
                ['Plot', ticket.plot_number], ['Delivery', delivery],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-[var(--muted)] text-xs uppercase tracking-wider">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
              {ticket.po_number && (
                <p className="text-sm pt-2 border-t border-[var(--border)]" style={{ color: 'var(--success)' }}>
                  Order: {ticket.po_number} · {ticket.delivery_date}
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
                What you requested
              </p>
              <LineItemsList ticket={ticket} />
            </div>

            <ImageStrip images={ticket.images} onSelect={lightbox.open} />

            {hasOrdered && (
              <div>
                <p className="text-[10px] font-bold text-[var(--success)] uppercase tracking-widest mb-2">
                  What was ordered
                </p>
                <div className="space-y-2">
                  {ticket.ordered_items!.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{it.description}</p>
                        {it.sap_code && (
                          <p className="text-[11px] font-mono text-[var(--muted)] mt-0.5">SAP: {it.sap_code}</p>
                        )}
                      </div>
                      <span className="font-mono font-semibold px-2.5 py-1 rounded-lg shrink-0 text-sm bg-white text-[var(--success)] border border-emerald-200">
                        ×{it.quantity}
                      </span>
                      {!locked && (
                        <button type="button" onClick={() => queryItem(it)}
                          className="text-[var(--danger)] text-xs font-semibold underline-offset-2 hover:underline shrink-0">
                          Query
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.status === 'ordered' && (
              <button
                onClick={confirmOrder}
                disabled={archiving}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--success)' }}
              >
                {archiving ? 'Confirming…' : 'Confirm Order'}
              </button>
            )}
          </div>
          <div ref={chatAnchorRef} className="border-t border-[var(--border)]" style={{ height: '300px' }}>
            <ChatPanel ticketId={ticket.id} role="manager"
              onTicketViewed={onTicketUpdate} onManagerResponded={onManagerResponded}
              draft={chatDraft} draftToken={draftToken} readOnly={locked} />
          </div>
        </div>
      </div>
      {lightbox.src && <ImageLightbox src={lightbox.src} onClose={lightbox.close} />}
    </>
  );
}
