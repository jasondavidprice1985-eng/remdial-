import { useState } from 'react';
import { Ticket } from '@shared/types';
import StatusBadge from './StatusBadge';
import StatusStepper from './StatusStepper';
import OrderForm from './OrderForm';
import ImageLightbox, { useLightbox } from './ImageLightbox';
import { LineItemsTable, PhotoGrid } from '../utils/ticketDisplay';
import { printTicket } from '../utils/printTicket';
import { fmtDateUK } from '../utils/formatDate';
import { apiFetch } from '../auth/apiClient';

const ORIGIN = (import.meta.env.VITE_SOCKET_URL as string) || '';

interface Props {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
  onCompleted?: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

function SectionLabel({ children, aux }: { children: React.ReactNode; aux?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <span className="text-[11px] font-medium text-[var(--faint)] uppercase tracking-[0.06em]">
        {children}
      </span>
      {aux && <span className="text-[12px] text-[var(--subtle)] tabular-nums">{aux}</span>}
    </div>
  );
}

export default function TicketDetailsPanel({ ticket, onUpdate, onCompleted, chatOpen, onToggleChat }: Props) {
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

  async function handleOrdered() {
    const res = await apiFetch(`/tickets/${ticket.id}?viewer=office`);
    if (res.ok) {
      const d = await res.json();
      if (d.ticket) onUpdate(d.ticket);
    }
    onCompleted?.();
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 bg-[var(--surface)]">
        {/* Top bar */}
        <div className="px-6 h-[52px] flex items-center justify-between border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[12px] text-[var(--muted)] font-medium">{ticket.ref}</span>
            <span className="text-[var(--ghost)]">·</span>
            <span className="text-[13px] text-[var(--subtle)] truncate">{ticket.developer}</span>
          </div>
          {onToggleChat && (
            <button type="button" onClick={onToggleChat}
              className="shrink-0 inline-flex items-center gap-2 text-[12.5px] font-medium px-3 h-8 rounded-md border transition-colors"
              style={{
                background: chatOpen ? 'var(--text)' : 'var(--surface)',
                color: chatOpen ? '#fff' : 'var(--text)',
                borderColor: chatOpen ? 'var(--text)' : 'var(--border)',
              }}
              title={chatOpen ? 'Hide messages' : 'Show messages'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Messages
              {(ticket.unread_count ?? 0) > 0 && !chatOpen && (
                <span className="bg-[var(--query)] text-white text-[10px] font-semibold tabular-nums px-1.5 rounded-full leading-[14px]">
                  {ticket.unread_count}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="mx-auto max-w-[880px] px-8 lg:px-12 py-7">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="font-mono text-[12px] text-[var(--muted)] font-medium mb-1.5">
                  {ticket.ref}
                </div>
                <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-[var(--text)] m-0">
                  {ticket.developer}
                </h1>
                <div className="mt-1.5 text-[13.5px] text-[var(--subtle)] flex flex-wrap gap-x-3 gap-y-1">
                  <span>{ticket.site}</span>
                  <span className="text-[var(--ghost)]">·</span>
                  <span>Plot {ticket.plot_number}</span>
                </div>
              </div>
              <div className="shrink-0 pt-1">
                <StatusBadge status={ticket.status} ticket={ticket} />
              </div>
            </div>

            <StatusStepper ticket={ticket} />

            <section className="pt-7">
              <SectionLabel aux={`${(ticket.line_items?.length || 1)} lines`}>Items requested</SectionLabel>
              <LineItemsTable ticket={ticket} />
            </section>

            {ticket.images && ticket.images.length > 0 && (
              <section className="pt-7 mt-7 border-t border-[var(--border)]">
                <SectionLabel aux={`${ticket.images.length} attached`}>Photos</SectionLabel>
                <PhotoGrid images={ticket.images} onSelect={lightbox.open} />
              </section>
            )}

            {ticket.status === 'ordered' && ticket.po_number && (
              <section className="pt-7 mt-7 border-t border-[var(--border)]">
                <SectionLabel>Ordered</SectionLabel>
                <div className="grid grid-cols-[140px_1fr] gap-x-5 gap-y-2.5 text-[13.5px]">
                  <div className="text-[var(--subtle)]">Order number</div>
                  <div className="font-mono text-[var(--text)]">{ticket.po_number}</div>
                  <div className="text-[var(--subtle)]">Delivery</div>
                  <div className="text-[var(--text)] tabular-nums">{fmtDateUK(ticket.delivery_date)}</div>
                </div>
                {ticket.ordered_items && ticket.ordered_items.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <SectionLabel>SAP items sent</SectionLabel>
                    <ul className="space-y-2 text-[13px]">
                      {ticket.ordered_items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3 py-2 border-b border-[var(--border)] last:border-b-0">
                          <span className="truncate">
                            {it.description}
                            {it.sap_code && <span className="ml-1.5 font-mono text-[var(--muted)] text-[12px]">[{it.sap_code}]</span>}
                          </span>
                          <span className="font-mono text-[var(--muted)] shrink-0 tabular-nums">×{it.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {showPrint && (
              <section className="pt-7 mt-7 border-t border-[var(--border)]">
                <button onClick={async () => {
                  let messages: import('@shared/types').Message[] = [];
                  try {
                    const res = await apiFetch(`/tickets/${ticket.id}/messages`);
                    if (res.ok) messages = (await res.json()).messages || [];
                  } catch { /* print without messages on fetch failure */ }
                  printTicket(ticket, ORIGIN, messages);
                }}
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text)] border border-[var(--border)] rounded-md h-9 px-4 hover:bg-[var(--surface-2)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Print ticket
                </button>
              </section>
            )}
          </div>
        </div>

        {/* Action bar */}
        {needsAcceptance && (
          <div className="shrink-0 border-t border-[var(--border)] px-8 lg:px-12 py-4 flex items-center justify-end gap-3 bg-[var(--surface)]">
            <button onClick={handleFlagQuery} disabled={accepting || flagging}
              className="h-10 px-5 rounded-md bg-[var(--inbox)] text-white text-[13px] font-semibold hover:brightness-110 disabled:opacity-50 transition">
              {flagging ? 'Flagging…' : 'Needs clarification'}
            </button>
            <button onClick={handleAccept} disabled={accepting || flagging}
              className="h-10 px-5 rounded-md bg-[var(--text)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-50 inline-flex items-center gap-2">
              {accepting ? 'Accepting…' : (
                <>
                  Accept ticket
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
        {showOrder && (
          <div className="shrink-0 border-t border-[var(--border)] px-8 lg:px-12 py-4 bg-[var(--surface)]">
            <OrderForm ticket={ticket} onOrdered={handleOrdered} />
          </div>
        )}
      </div>
      {lightbox.src && <ImageLightbox src={lightbox.src} onClose={lightbox.close} />}
    </>
  );
}
