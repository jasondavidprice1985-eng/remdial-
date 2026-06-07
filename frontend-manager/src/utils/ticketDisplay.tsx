import { Ticket } from '@shared/types';
import { REASON_LABEL } from '../constants/reasons';

const ORIGIN = import.meta.env.VITE_SOCKET_URL as string;

export function itemsSummary(ticket: Ticket): string {
  if (ticket.line_items?.length) return ticket.line_items.map(i => i.description).join(', ');
  return ticket.items;
}

export function LineItemsList({ ticket }: { ticket: Ticket }) {
  const rows = ticket.line_items?.length
    ? ticket.line_items
    : [{ description: ticket.items, quantity: ticket.quantity, reason: ticket.reason }];

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{row.description}</p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">{REASON_LABEL[row.reason] || row.reason}</p>
          </div>
          <span className="font-mono font-semibold px-2.5 py-1 rounded-lg shrink-0 text-sm bg-blue-50 text-[var(--ref)] border border-blue-100">×{row.quantity}</span>
        </div>
      ))}
    </div>
  );
}

export function ImageStrip({ images, onSelect }: { images: string[]; onSelect: (src: string) => void }) {
  if (!images.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
        Photos · {images.length}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((uri, i) => (
          <button key={i} type="button" onClick={() => onSelect(`${ORIGIN}${uri}`)}
            className="aspect-square rounded-xl overflow-hidden ring-1 ring-[var(--border)] hover:ring-white/30 transition-all">
            <img src={`${ORIGIN}${uri}`} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
