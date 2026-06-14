import React, { useState, useEffect } from 'react';
import { OrderedLineItem, Ticket } from '@shared/types';
import { apiFetch } from '../auth/apiClient';
import ProductTypeahead from './ProductTypeahead';

interface Props {
  ticket: Ticket;
  onOrdered: () => void;
}

function requestedToOrdered(ticket: Ticket): OrderedLineItem[] {
  // Inherit the SAP code from each requested line item so the office team
  // doesn't have to re-key anything the manager already provided.
  if (ticket.line_items?.length) {
    return ticket.line_items.map(i => ({
      description: i.description,
      quantity: i.quantity,
      sap_code: i.sap_code || '',
    }));
  }
  return [{ description: ticket.items, quantity: ticket.quantity, sap_code: '' }];
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

  const noRowsYet = orderedItems.length === 1 && !orderedItems[0].description.trim() && !orderedItems[0].sap_code?.trim();

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--text)] tracking-[-0.01em] m-0">Mark as ordered</h3>
      </div>

      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-[var(--subtle)]">SAP items ordered</label>
        {noRowsYet && (
          <p className="text-[11.5px] text-[var(--muted)]">
            Pick from the dropdown or type to search by SAP code or description.
          </p>
        )}
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
          className="text-[12.5px] font-semibold text-[var(--pending)]">+ Add another row</button>
      </div>

      {error && <p className="text-xs text-[var(--query)]">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2 sm:col-span-1">
          <span className="block text-[12px] font-medium text-[var(--subtle)] mb-1">Order number</span>
          <input className="input-field" maxLength={100} value={poNumber}
            onChange={e => setPoNumber(e.target.value)} disabled={loading} required />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="block text-[12px] font-medium text-[var(--subtle)] mb-1">Delivery date</span>
          <input type="date" className="input-field" value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)} disabled={loading} required />
        </label>
      </div>
      <button type="submit" disabled={!canSubmit}
        className="w-full h-12 rounded-md text-[14px] font-semibold text-white disabled:opacity-40 bg-[var(--ordered)] hover:opacity-90">
        {loading ? 'Saving…' : 'Mark ordered'}
      </button>
    </form>
  );
}
