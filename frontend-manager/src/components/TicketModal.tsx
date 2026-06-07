import { useState } from 'react';
import { Ticket } from '@shared/types';
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

  async function confirmFitted() {
    if (archiving) return;
    if (!window.confirm('Mark this remedial as fitted? It will be archived.')) return;
    setArchiving(true);
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/archive`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onClose();
    } catch {
      setArchiving(false);
      window.alert('Could not archive ticket. Please try again.');
    }
  }

  const delivery = ticket.delivery_request?.type === 'specific_date'
    ? ticket.delivery_request.date : 'Next delivery';

  return (
    <>
      <div className="fixed inset-0 z-40 animate-slide-up flex flex-col bg-[var(--bg)]" {...swipe}>
        <div className="flex items-center justify-between px-4 py-3 glass border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-base text-[var(--ref)]">{ticket.ref}</span>
            <StatusBadge status={ticket.status} />
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
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Line Items</p>
              <LineItemsList ticket={ticket} />
            </div>
            <ImageStrip images={ticket.images} onSelect={lightbox.open} />
            {ticket.status === 'ordered' && (
              <button
                onClick={confirmFitted}
                disabled={archiving}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--success)' }}
              >
                {archiving ? 'Archiving…' : 'Confirm Fitted'}
              </button>
            )}
          </div>
          <div className="border-t border-[var(--border)]" style={{ height: '300px' }}>
            <ChatPanel ticketId={ticket.id} role="manager"
              onTicketViewed={onTicketUpdate} onManagerResponded={onManagerResponded} />
          </div>
        </div>
      </div>
      {lightbox.src && <ImageLightbox src={lightbox.src} onClose={lightbox.close} />}
    </>
  );
}
