import React, { useState, useEffect } from 'react';

interface Props {
  ticketId: string;
  onOrdered: () => void;
}

const API = import.meta.env.VITE_API_URL as string;

export default function OrderForm({ ticketId, onOrdered }: Props) {
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/settings/next-delivery`)
      .then(r => r.json())
      .then(d => { if (d.next_delivery_date) setDeliveryDate(d.next_delivery_date); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!poNumber.trim() || !deliveryDate) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/tickets/${ticketId}/order`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_number: poNumber.trim(), delivery_date: deliveryDate }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to mark as ordered'); }
      else { onOrdered(); setPoNumber(''); }
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Mark as ordered</p>
      {error && <p className="text-xs text-[var(--query)]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input className="input-field col-span-2 sm:col-span-1" placeholder="PO number *" maxLength={100} value={poNumber}
          onChange={e => setPoNumber(e.target.value)} disabled={loading} required />
        <input type="date" className="input-field col-span-2 sm:col-span-1" value={deliveryDate}
          onChange={e => setDeliveryDate(e.target.value)} disabled={loading} required />
      </div>
      <button type="submit" disabled={!poNumber.trim() || !deliveryDate || loading}
        className="w-full h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-40 bg-[var(--ordered)] hover:opacity-90">
        {loading ? 'Saving…' : 'Mark ordered'}
      </button>
    </form>
  );
}
