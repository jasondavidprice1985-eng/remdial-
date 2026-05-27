import { Ticket } from '@shared/types';
import StatusBadge from './StatusBadge';
import ChatPanel from './ChatPanel';
import ImageLightbox, { useLightbox } from './ImageLightbox';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import { LineItemsList, ImageStrip } from '../utils/ticketDisplay';


interface Props {
  ticket: Ticket;
  onClose: () => void;
  onTicketUpdate: (ticket: Ticket) => void;
  onManagerResponded: () => void;
}

export default function TicketModal({ ticket, onClose, onTicketUpdate, onManagerResponded }: Props) {
  const lightbox = useLightbox();
  const swipe = useSwipeToClose(onClose);

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
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] bg-stone-100">×</button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-4">
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
                  PO: {ticket.po_number} · {ticket.delivery_date}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Line Items</p>
              <LineItemsList ticket={ticket} />
            </div>
            <ImageStrip images={ticket.images} onSelect={lightbox.open} />
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
