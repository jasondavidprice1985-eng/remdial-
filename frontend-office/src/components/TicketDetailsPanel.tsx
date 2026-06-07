import { useState } from 'react';
import { Ticket } from '@shared/types';
import StatusBadge from './StatusBadge';
import OrderForm from './OrderForm';
import ImageLightbox, { useLightbox } from './ImageLightbox';
import { LineItemsTable, ImageStrip } from '../utils/ticketDisplay';
import { printTicket } from '../utils/printTicket';
import { apiFetch } from '../auth/apiClient';

const ORIGIN = (import.meta.env.VITE_SOCKET_URL as string) || '';

interface Props {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export default function TicketDetailsPanel({ ticket, onUpdate, chatOpen, onToggleChat }: Props) {
  const [clarifying, setClarifying] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const lightbox = useLightbox();
  const needsAcceptance = ticket.status === 'pending' && !ticket.accepted_at;
  const showOrder = (ticket.status === 'pending' && !!ticket.accepted_at) || ticket.status === 'query';
  const showPrint = ticket.status === 'ordered' || ticket.status === 'archived';

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/accept`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (res.ok) onUpdate((await res.json()).ticket);
    } finally { setAccepting(false); }
  }

  async function handleFlagQuery() {
    setFlagging(true);
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/query`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (res.ok) onUpdate((await res.json()).ticket);
    } finally { setFlagging(false); }
  }

  async function handleClarified() {
    setClarifying(true);
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/clarified`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (res.ok) onUpdate((await res.json()).ticket);
    } finally { setClarifying(false); }
  }

  async function handleOrdered() {
    const res = await apiFetch(`/tickets/${ticket.id}?viewer=office`);
    if (res.ok) {
      const d = await res.json();
      if (d.ticket) onUpdate(d.ticket);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface-2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-base text-[var(--ref)]">{ticket.ref}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {ticket.developer} · {ticket.site} · Plot {ticket.plot_number}
              </p>
            </div>
            {onToggleChat && (
              <button type="button" onClick={onToggleChat}
                className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  chatOpen
                    ? 'bg-[var(--pending)] text-white border-transparent'
                    : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                }`}
                title={chatOpen ? 'Hide messages' : 'Show messages'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Messages
                {(ticket.unread_count ?? 0) > 0 && !chatOpen && (
                  <span className="ml-1 px-1.5 rounded-full bg-[var(--query)] text-white text-[10px]">
                    {ticket.unread_count}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <LineItemsTable ticket={ticket} />
          <ImageStrip images={ticket.images} onSelect={lightbox.open} />
          {ticket.status === 'ordered' && ticket.po_number && (
            <div className="card p-3 text-sm text-[var(--ordered)]">
              <p className="font-semibold">Ordered</p>
              <p className="mt-1">Order Number: {ticket.po_number}</p>
              <p className="text-[var(--muted)]">Delivery: {ticket.delivery_date}</p>
            </div>
          )}
          {showPrint && (
            <button onClick={() => printTicket(ticket, ORIGIN)}
              className="w-full h-9 rounded-lg text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--muted)] flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Ticket
            </button>
          )}
        </div>
        {needsAcceptance && (
          <div className="shrink-0 border-t border-[var(--border)] p-4 bg-[var(--surface-2)] space-y-2">
            <button onClick={handleAccept} disabled={accepting || flagging}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-[var(--pending)] hover:opacity-90 disabled:opacity-50">
              {accepting ? 'Accepting…' : 'Accept Ticket'}
            </button>
            <button onClick={handleFlagQuery} disabled={accepting || flagging}
              className="w-full h-11 rounded-xl text-sm font-semibold text-[var(--query)] border-2 border-[var(--query)] bg-white hover:bg-red-50 disabled:opacity-50">
              {flagging ? 'Flagging…' : 'Needs Clarification'}
            </button>
          </div>
        )}
        {showOrder && (
          <div className="shrink-0 border-t border-[var(--border)] p-4 bg-[var(--surface-2)] space-y-3">
            <OrderForm ticketId={ticket.id} onOrdered={handleOrdered} />
            {ticket.status === 'query' && (
              <button onClick={handleClarified} disabled={clarifying}
                className="w-full h-9 rounded-lg text-sm font-semibold text-[var(--pending)] border border-[var(--pending)] bg-white hover:bg-blue-50 disabled:opacity-50">
                {clarifying ? 'Saving…' : 'Mark Clarified'}
              </button>
            )}
          </div>
        )}
      </div>
      {lightbox.src && <ImageLightbox src={lightbox.src} onClose={lightbox.close} />}
    </>
  );
}
