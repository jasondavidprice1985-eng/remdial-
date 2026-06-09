import { Ticket, TicketItem } from '@shared/types';
import { REASON_LABEL } from '../constants/reasons';

const ORIGIN = import.meta.env.VITE_SOCKET_URL as string;

export function getLineItems(ticket: Ticket): Pick<TicketItem, 'description' | 'quantity' | 'reason'>[] {
  if (ticket.line_items?.length) return ticket.line_items;
  return [{ description: ticket.items, quantity: ticket.quantity, reason: ticket.reason }];
}

export function LineItemsTable({ ticket }: { ticket: Ticket }) {
  const rows = getLineItems(ticket);
  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[28px_1fr_48px] gap-4 items-baseline py-3.5 border-t border-[var(--border)] first:border-t-0">
          <div className="font-mono text-[11px] text-[var(--faint)] pt-0.5 tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </div>
          <div>
            <div className="text-[14px] text-[var(--text)] leading-snug">{row.description}</div>
            <div className="text-[12px] text-[var(--subtle)] mt-1">{REASON_LABEL[row.reason] || row.reason}</div>
          </div>
          <div className="font-mono text-[13px] text-[var(--muted)] text-right tabular-nums">
            ×{row.quantity}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ImageStrip({ images, onSelect }: { images: string[]; onSelect: (src: string) => void }) {
  if (!images.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {images.map((uri, i) => (
        <button key={i} type="button" onClick={() => onSelect(`${ORIGIN}${uri}`)}
          className="shrink-0 rounded-md overflow-hidden border border-[var(--border)] hover:border-[var(--text)] transition-colors">
          <img src={`${ORIGIN}${uri}`} alt={`photo ${i + 1}`} className="w-20 h-20 object-cover" />
        </button>
      ))}
    </div>
  );
}

export function PhotoGrid({ images, onSelect }: { images: string[]; onSelect: (src: string) => void }) {
  if (!images.length) return null;
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {images.map((uri, i) => (
        <button key={i} type="button" onClick={() => onSelect(`${ORIGIN}${uri}`)}
          className="aspect-square rounded-md overflow-hidden border border-[var(--border)] hover:border-[var(--text)] transition-colors">
          <img src={`${ORIGIN}${uri}`} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}
