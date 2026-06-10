import React, { useState, useEffect } from 'react';
import { OrderedLineItem, Ticket } from '@shared/types';
import { apiFetch } from '../auth/apiClient';
import ProductTypeahead from './ProductTypeahead';

interface Props {
  ticket: Ticket;
  onOrdered: () => void;
}

function requestedToOrdered(ticket: Ticket): OrderedLineItem[] {
  const src = ticket.line_items?.length
    ? ticket.line_items.map(i => ({ description: i.description, quantity: i.quantity }))
    : [{ description: ticket.items, quantity: ticket.quantity }];
  return src.map(s => ({ ...s, sap_code: '' }));
}

export default function OrderForm({ ticket, onOrdered }: Props) {
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderedItems, setOrderedItems] = useState<OrderedLineItem[]>(() => requestedToOrdered(ticket));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If the ticket changes (different selection), reset the editor
  useEffect(() => {
    setOrderedItems(requestedToOrdered(ticket));
    setPoNumber('');
    setError('');
  }, [ticket.id]);

  useEffect(() => {
    apiFetch('/settings/next-delivery')
      .then(r => r.json())
      .then(d => { if (d.next_delivery_date) setDeliveryDate(d.next_delivery_date); })
      .catch(() => {});
  }, []);

  function updateRow(i: number, patch: Partial<OrderedLineItem>) {
    setOrderedItems(prev => prev.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }

  function removeRow(i: number) {
    setOrderedItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function addRow() {
    setOrderedItems(prev => [...prev, { description: '', quantity: 1, sap_code: '' }]);
  }

  const validItems = orderedItems
    .map(it => ({ ...it, description: it.description.trim(), sap_code: it.sap_code?.trim() || undefined }))
    .filter(it => it.description.length > 0 && it.quantity >= 1);

  const canSubmit = !!poNumber.trim() && !!deliveryDate && validItems.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      const res = await apiFetch(`/tickets/${ticket.id}/order`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: poNumber.trim(),
          delivery_date: deliveryDate,
          ordered_items: validItems,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to mark as ordered'); }
      else {
        // Auto-learn: save any new products for future typeahead
        const learnItems = validItems
          .filter(it => it.sap_code)
          .map(it => ({ sap_code: it.sap_code, description: it.description }));
        if (learnItems.length > 0) {
          apiFetch('/products/learn', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: learnItems }),
          }).catch(() => {}); // Fire and forget
        }
        onOrdered(); setPoNumber('');
      }
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Mark as ordered</p>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">SAP items ordered</p>
        <p className="text-[11px] text-[var(--muted)]">
          Start typing a description or SAP code to search. Pick from the dropdown or type manually.
        </p>
        {orderedItems.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
            <ProductTypeahead
              sapCode={row.sap_code || ''}
              description={row.description}
              onSelect={(sap, desc) => updateRow(i, { sap_code: sap, description: desc })}
              disabled={loading}
            />
            <input type="number" min={1} className="input-field col-span-1 text-xs text-center font-mono"
              value={row.quantity} onChange={e => updateRow(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              disabled={loading} />
            <button type="button" onClick={() => removeRow(i)} disabled={loading || orderedItems.length <= 1}
              className="col-span-1 text-[var(--query)] text-base disabled:opacity-30"
              aria-label="Remove">×</button>
          </div>
        ))}
        <button type="button" onClick={addRow} disabled={loading}
          className="text-xs font-semibold text-[var(--pending)]">+ Add row</button>
      </div>

      {error && <p className="text-xs text-[var(--query)]">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <input className="input-field col-span-2 sm:col-span-1" placeholder="Order number *" maxLength={100} value={poNumber}
          onChange={e => setPoNumber(e.target.value)} disabled={loading} required />
        <input type="date" className="input-field col-span-2 sm:col-span-1" value={deliveryDate}
          onChange={e => setDeliveryDate(e.target.value)} disabled={loading} required />
      </div>
      <button type="submit" disabled={!canSubmit}
        className="w-full h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-40 bg-[var(--ordered)] hover:opacity-90">
        {loading ? 'Saving…' : 'Mark ordered'}
      </button>
    </form>
  );
}
