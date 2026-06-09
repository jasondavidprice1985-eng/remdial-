import { useState } from 'react';
import { LineItemInput } from '@shared/types';
import { REASON_LABEL } from '../constants/reasons';
import LineItemSheet from './LineItemSheet';

interface Props {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  disabled: boolean;
}

const EMPTY: LineItemInput = { description: '', quantity: 1, reason: '' };

function isFilled(row: LineItemInput): boolean {
  return row.description.trim().length > 0 && row.quantity >= 1 && row.reason !== '';
}

export default function LineItemBuilder({ items, onChange, disabled }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function save(i: number, patch: LineItemInput) {
    onChange(items.map((row, idx) => idx === i ? patch : row));
    setEditingIndex(null);
  }

  function clearRow(i: number) {
    onChange(items.map((row, idx) => idx === i ? { ...EMPTY } : row));
    setEditingIndex(null);
  }

  function addRow() {
    onChange([...items, { ...EMPTY }]);
  }

  return (
    <div className="space-y-2">
      {items.map((row, i) => {
        const filled = isFilled(row);
        return (
          <button key={i} type="button" disabled={disabled}
            onClick={() => setEditingIndex(i)}
            className={`w-full text-left p-3 rounded-xl border transition-colors ${
              filled
                ? 'bg-white border-[var(--border)]'
                : 'bg-stone-50 border-dashed border-stone-300'
            }`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[var(--muted)] tracking-wider">ITEM {i + 1}</span>
              <span className="text-sm font-semibold text-[var(--action)]">
                {filled ? 'Edit' : 'Tap to add'}
              </span>
            </div>
            {filled && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-sm font-medium">{row.description} <span className="text-[var(--muted)]">× {row.quantity}</span></p>
                <p className="text-xs text-[var(--muted)]">{REASON_LABEL[row.reason] || row.reason}</p>
              </div>
            )}
          </button>
        );
      })}
      <button type="button" onClick={addRow} disabled={disabled}
        className="w-full mt-3 h-[52px] text-[16px] font-semibold text-[var(--ordered)] flex items-center justify-center gap-1.5 disabled:opacity-50">
        + Add Another Item
      </button>

      {editingIndex !== null && (
        <LineItemSheet
          index={editingIndex}
          initial={items[editingIndex]}
          canDelete={items.length > 1}
          onSave={(item) => save(editingIndex, item)}
          onDelete={() => {
            // If more than 1 row, remove it; otherwise just clear it.
            if (items.length > 1) {
              onChange(items.filter((_, idx) => idx !== editingIndex));
              setEditingIndex(null);
            } else {
              clearRow(editingIndex);
            }
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}
