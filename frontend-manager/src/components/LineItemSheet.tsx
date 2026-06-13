import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LineItemInput } from '@shared/types';
import { REASONS } from '../constants/reasons';
import DescriptionTypeahead from './DescriptionTypeahead';
import { KitchenItem } from './KitchenPicker';

interface Props {
  index: number;
  initial: LineItemInput;
  canDelete: boolean;
  kitchenItems?: KitchenItem[];
  onSave: (item: LineItemInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

type Subset = 'full' | 'door' | 'carcase' | 'shelf' | 'other';

/**
 * Heuristic match for "the door for this unit". The picked SAP code carries
 * the width (e.g. 60 = 600mm) and hand (L/R). We search the same kitchen for
 * a D-prefix line (door) sharing both, ranking matches at the same Sales Doc
 * first since those typically belong to the same physical assembly.
 */
function findDoorFor(unit: KitchenItem | null, kitchen?: KitchenItem[]): KitchenItem | null {
  if (!unit || !kitchen) return null;
  const m = unit.sapCode.match(/^[A-Z]+(\d{2,4})([LR])/);
  if (!m) return null;
  const widthToken = m[1];
  const hand = m[2];
  const candidates = kitchen.filter(k => {
    if (!/^D/.test(k.sapCode) || k.sapCode === unit.sapCode) return false;
    const rx = new RegExp(`^D${widthToken}${hand}`);
    return rx.test(k.sapCode);
  });
  candidates.sort((a, b) => (a.salesDoc === unit.salesDoc ? -1 : 1) - (b.salesDoc === unit.salesDoc ? -1 : 1));
  return candidates[0] ?? null;
}

export default function LineItemSheet({ index, initial, canDelete, kitchenItems, onSave, onDelete, onClose }: Props) {
  const [description, setDescription] = useState(initial.description);
  const [sapCode, setSapCode] = useState<string | undefined>(initial.sap_code);
  const [quantity, setQuantity] = useState(initial.quantity || 1);
  const [reason, setReason] = useState<string>(initial.reason);
  const [subset, setSubset] = useState<Subset>('full');
  const [subsetOpen, setSubsetOpen] = useState(false);

  // Original (full unit) values — we hold these so "Carcase only" or "Full unit"
  // can restore after the user has tried "The door".
  const original = useMemo(() => ({
    sapCode: initial.sap_code,
    description: initial.description,
    quantity: initial.quantity || 1,
  }), [initial.sap_code, initial.description, initial.quantity]);

  const originalKitchenItem: KitchenItem | null = useMemo(() => {
    if (!original.sapCode || !kitchenItems) return null;
    return kitchenItems.find(k => k.sapCode === original.sapCode) ?? null;
  }, [original.sapCode, kitchenItems]);

  const doorMatch = useMemo(() => findDoorFor(originalKitchenItem, kitchenItems), [originalKitchenItem, kitchenItems]);

  const showSubsetPicker = !!original.sapCode && !!kitchenItems && kitchenItems.length > 0;

  function applySubset(next: Subset) {
    setSubset(next);
    if (next === 'full' || next === 'carcase') {
      setSapCode(original.sapCode);
      setDescription(original.description);
      setQuantity(original.quantity);
    } else if (next === 'door') {
      if (doorMatch) {
        setSapCode(doorMatch.sapCode);
        setDescription(doorMatch.description ?? doorMatch.sapCode);
        setQuantity(1);
      } else {
        // No matched door in kitchen — drop to free text so manager can type
        setSapCode(undefined);
        setDescription('');
        setQuantity(1);
      }
    } else if (next === 'shelf') {
      setSapCode(undefined);
      setDescription(original.sapCode ? `Shelf for ${original.sapCode}` : '');
      setQuantity(1);
    } else if (next === 'other') {
      setSapCode(undefined);
      setDescription('');
      setQuantity(1);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = description.trim().length > 0 && quantity >= 1 && reason !== '';

  function handleSave() {
    if (!canSave) return;
    onSave({ description: description.trim(), quantity, reason, sap_code: sapCode });
  }

  return createPortal((
    <div className="app-fieldrem fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-slide-up" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)]
                      shadow-xl p-5 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Item {index + 1}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] bg-stone-100">×</button>
        </div>

        {original.sapCode && (
          <div className="rounded-lg bg-stone-50 border border-[var(--border)] px-3 py-2">
            <span className="text-[10px] font-bold text-[var(--muted)] tracking-wider uppercase block">From kitchen</span>
            <p className="text-[13px] text-[var(--text)] leading-tight mt-0.5">
              <span className="font-mono font-semibold">{original.sapCode}</span>
              {original.description && <span className="text-[var(--subtle)]"> · {original.description}</span>}
            </p>
          </div>
        )}

        <div>
          {sapCode && sapCode !== original.sapCode && (
            <div className="mb-2.5">
              <span className="text-[10px] font-bold text-[var(--ordered)] tracking-wider uppercase block">SAP code</span>
              <p className="font-mono text-[18px] font-semibold text-[var(--text)] leading-tight mt-0.5">{sapCode}</p>
            </div>
          )}

          {showSubsetPicker && (
            <div className="mb-3">
              {!subsetOpen ? (
                <button type="button" onClick={() => setSubsetOpen(true)}
                  className="text-[12.5px] font-semibold text-[var(--action)] underline-offset-2 hover:underline">
                  Only need part of this unit?
                </button>
              ) : (
                <div className="rounded-lg border border-[var(--border)] bg-stone-50 p-3">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">What do you need?</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { value: 'full',    label: 'Full unit' },
                      { value: 'door',    label: doorMatch ? `The door (${doorMatch.sapCode})` : 'The door' },
                      { value: 'carcase', label: 'Carcase only' },
                      { value: 'shelf',   label: 'Shelf' },
                      { value: 'other',   label: 'Other' },
                    ] as { value: Subset; label: string }[]).map(opt => {
                      const selected = subset === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => applySubset(opt.value)}
                          className={`px-3 py-1.5 text-[12.5px] font-semibold rounded-full border transition-colors ${
                            selected
                              ? 'bg-stone-800 text-white border-stone-800'
                              : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                          }`}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {subset === 'door' && !doorMatch && (
                    <p className="mt-2 text-[11.5px] text-[var(--subtle)]">
                      No matching door found in this kitchen — type the door details below.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Description</span>
            <div className="mt-1">
              <DescriptionTypeahead
                value={description}
                onChange={(desc, sap) => { setDescription(desc); setSapCode(sap); }}
                autoFocus
              />
            </div>
          </label>
        </div>

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
  ), document.body);
}
