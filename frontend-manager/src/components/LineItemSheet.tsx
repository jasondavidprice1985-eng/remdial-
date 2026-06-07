import { useEffect, useState } from 'react';
import { LineItemInput } from '@shared/types';
import { REASONS } from '../constants/reasons';

interface Props {
  index: number;
  initial: LineItemInput;
  canDelete: boolean;
  onSave: (item: LineItemInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function LineItemSheet({ index, initial, canDelete, onSave, onDelete, onClose }: Props) {
  const [description, setDescription] = useState(initial.description);
  const [quantity, setQuantity] = useState(initial.quantity || 1);
  const [reason, setReason] = useState<string>(initial.reason);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = description.trim().length > 0 && quantity >= 1 && reason !== '';

  function handleSave() {
    if (!canSave) return;
    onSave({ description: description.trim(), quantity, reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-slide-up" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)]
                      shadow-xl p-5 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Item {index + 1}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] bg-stone-100">×</button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Description</span>
          <input className="input-field mt-1" placeholder="e.g. Soft close hinge" maxLength={200}
            value={description} onChange={e => setDescription(e.target.value)} autoFocus />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Quantity</span>
          <div className="mt-1 flex items-center gap-3">
            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-12 h-12 rounded-full bg-stone-100 text-xl font-bold">−</button>
            <input type="number" min={1} value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field w-20 text-center font-mono" />
            <button type="button" onClick={() => setQuantity(q => q + 1)}
              className="w-12 h-12 rounded-full bg-stone-100 text-xl font-bold">+</button>
          </div>
        </label>

        <div>
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Reason</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {REASONS.map(r => {
              const selected = reason === r.value;
              return (
                <button key={r.value} type="button" onClick={() => setReason(r.value)}
                  className={`min-h-[40px] px-3.5 py-2 text-sm font-medium rounded-full border transition-colors ${
                    selected ? 'bg-stone-800 text-white border-stone-800'
                             : 'bg-white text-stone-700 border-stone-300'
                  }`}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {canDelete && (
            <button type="button" onClick={onDelete}
              className="flex-1 min-h-[48px] rounded-xl font-semibold text-[var(--danger)] bg-white border border-[var(--border)]">
              Delete
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={!canSave}
            className="btn-accent flex-[2]">Save</button>
        </div>
      </div>
    </div>
  );
}
