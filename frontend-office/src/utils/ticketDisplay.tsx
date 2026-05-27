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
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-[var(--muted)] uppercase tracking-wider bg-[var(--surface-2)]">
            <th className="px-3 py-2 font-semibold">Description</th>
            <th className="px-3 py-2 font-semibold w-12">Qty</th>
            <th className="px-3 py-2 font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              <td className="px-3 py-2.5">{row.description}</td>
              <td className="px-3 py-2.5 font-mono text-[var(--muted)]">{row.quantity}</td>
              <td className="px-3 py-2.5 text-[11px] text-[var(--muted)]">{REASON_LABEL[row.reason] || row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImageStrip({ images, onSelect }: { images: string[]; onSelect: (src: string) => void }) {
  if (!images.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {images.map((uri, i) => (
        <button key={i} type="button" onClick={() => onSelect(`${ORIGIN}${uri}`)}
          className="shrink-0 rounded-lg overflow-hidden ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-all">
          <img src={`${ORIGIN}${uri}`} alt={`photo ${i + 1}`} className="w-20 h-20 object-cover" />
        </button>
      ))}
    </div>
  );
}
