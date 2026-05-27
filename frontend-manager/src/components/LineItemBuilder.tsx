import { LineItemInput, TicketReason } from '@shared/types';
import { REASONS } from '../constants/reasons';

interface Props {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  disabled: boolean;
}

export default function LineItemBuilder({ items, onChange, disabled }: Props) {
  function update(i: number, patch: Partial<LineItemInput>) {
    onChange(items.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }

  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <div key={i} className="p-4 rounded-xl space-y-3 animate-slide-up bg-stone-50 border border-[var(--border)]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[var(--muted)] tracking-wider">ITEM {i + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} disabled={disabled}
                className="text-[var(--danger)] text-sm font-semibold min-h-[36px] px-2">Remove</button>
            )}
          </div>
          <input className="input-field" placeholder="Description *" maxLength={200} value={row.description}
            onChange={e => update(i, { description: e.target.value })} disabled={disabled} required />
          <input type="number" min={1} className="input-field w-20 text-center font-mono" value={row.quantity}
            onChange={e => update(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} disabled={disabled} required />
          <div className="flex flex-wrap gap-2">
            {REASONS.map(r => {
              const selected = row.reason === r.value;
              return (
                <button key={r.value} type="button" disabled={disabled}
                  onClick={() => update(i, { reason: r.value as TicketReason })}
                  className={`min-h-[40px] px-3.5 py-2 text-sm font-medium rounded-full border transition-colors ${
                    selected
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { description: '', quantity: 1, reason: '' }])}
        disabled={disabled} className="text-base font-semibold text-[var(--action)] min-h-[44px]">
        + Add Item
      </button>
    </div>
  );
}
