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
  // If the row came from a kitchen pick (has a sap_code) the description
  // becomes an optional note; start it empty so the "Add a note" button
  // shows. Otherwise (manual entry) keep whatever was there.
  const [description, setDescription] = useState(initial.sap_code ? '' : initial.description);
  const [sapCode, setSapCode] = useState<string | undefined>(initial.sap_code);
  const [quantity, setQuantity] = useState(initial.quantity || 1);
  const [reason, setReason] = useState<string>(initial.reason);
  const [subset, setSubset] = useState<Subset>('full');
  const [subsetOpen, setSubsetOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [kitchenPickOpen, setKitchenPickOpen] = useState(false);
  const [kitchenQuery, setKitchenQuery] = useState('');

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
    // Keep the chip group visible after a pick so the selection stays on
    // screen — the highlighted chip tells the manager what they chose.
    setSubsetOpen(true);
    setQuantity(1);
    if (next === 'full' || next === 'carcase') {
      setSapCode(original.sapCode);
    } else if (next === 'door' && doorMatch) {
      setSapCode(doorMatch.sapCode);
    } else {
      // door (no match) / shelf / other: no specific SAP code,
      // the badge + chip + optional note tell office what's needed.
      setSapCode(undefined);
    }
    // Always clear the optional note when switching modes
    setDescription('');
    setNoteOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // When the line came from a kitchen pick, description isn't required to save
  // — the SAP code and "From kitchen" badge already say what the item is.
  // For manual entries, description is still required.
  const fromKitchen = !!original.sapCode;
  const subsetLabel: Partial<Record<Subset, string>> = {
    full: 'Full unit',
    door: 'Door only',
    carcase: 'Carcase only',
    shelf: 'Shelf',
    other: 'Other',
  };
  const canSave = quantity >= 1 && reason !== '' && (
    fromKitchen ? true : description.trim().length > 0
  );

  function handleSave() {
    if (!canSave) return;
    // If kitchen-picked and no manual description was added, fall back to
    // a sensible string so office sees what was requested.
    const finalDescription = description.trim() || (
      fromKitchen
        ? `${subsetLabel[subset] ?? 'Full unit'} of ${original.sapCode}${original.description ? ` (${original.description})` : ''}`
        : ''
    );
    onSave({ description: finalDescription, quantity, reason, sap_code: sapCode });
  }

  return createPortal((
    <div className="app-fieldrem fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-slide-up" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)]
                      shadow-xl p-5 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Item {index + 1}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] bg-stone-100">×</button>
        </div>

        {!fromKitchen && !description.trim() && !sapCode && kitchenItems && kitchenItems.length > 0 && !kitchenPickOpen && (
          <button type="button" onClick={() => setKitchenPickOpen(true)}
            className="w-full h-12 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] text-[14px] font-semibold flex items-center justify-center gap-2 hover:border-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 4l9 5.5" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" />
            </svg>
            Pick from kitchen
          </button>
        )}

        {kitchenPickOpen && kitchenItems && (
          <div className="space-y-2">
            <input type="search" placeholder="Search kitchen items…" value={kitchenQuery} autoFocus
              onChange={e => setKitchenQuery(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[14px] text-[var(--text)] focus:outline-none focus:border-[var(--text)]" />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {kitchenItems.filter(i => {
                const q = kitchenQuery.toLowerCase();
                return !q || i.sapCode.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q);
              }).map((item, idx) => (
                <button key={`${item.salesDoc}-${item.sapCode}-${idx}`} type="button"
                  onClick={() => {
                    setDescription(item.description || item.sapCode);
                    setSapCode(item.sapCode);
                    setQuantity(item.quantity ?? 1);
                    setKitchenPickOpen(false);
                    setKitchenQuery('');
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-[var(--border)] bg-white hover:border-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[12px] font-semibold text-[var(--text)]">{item.sapCode}</span>
                    <span className="text-[11px] text-[var(--subtle)] tabular-nums shrink-0">× {item.quantity ?? 1}</span>
                  </div>
                  {item.description && <p className="text-[11.5px] text-[var(--subtle)] mt-0.5 leading-tight truncate">{item.description}</p>}
                </button>
              ))}
              {kitchenItems.filter(i => {
                const q = kitchenQuery.toLowerCase();
                return !q || i.sapCode.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q);
              }).length === 0 && (
                <p className="text-[12px] text-[var(--subtle)] text-center py-3">No items match your search</p>
              )}
            </div>
            <button type="button" onClick={() => { setKitchenPickOpen(false); setKitchenQuery(''); }}
              className="text-[11.5px] text-[var(--subtle)] hover:text-[var(--text)] font-medium">Cancel</button>
          </div>
        )}

        {original.sapCode && (
          <div className="rounded-lg bg-stone-50 border border-[var(--border)] px-3 py-2">
            <span className="text-[10px] font-bold text-[var(--muted)] tracking-wider uppercase block">From kitchen</span>
            <p className="text-[13px] text-[var(--text)] leading-tight mt-0.5">
              <span className="font-mono font-semibold">{original.sapCode}</span>
              {original.description && <span className="text-[var(--subtle)]"> · {original.description}</span>}
            </p>
          </div>
        )}

        {sapCode && sapCode !== original.sapCode && (
          <div>
            <span className="text-[10px] font-bold text-[var(--ordered)] tracking-wider uppercase block">SAP code</span>
            <p className="font-mono text-[18px] font-semibold text-[var(--text)] leading-tight mt-0.5">{sapCode}</p>
          </div>
        )}

        {showSubsetPicker && !subsetOpen && (
          <button type="button" onClick={() => setSubsetOpen(true)}
            className="w-full min-h-[48px] rounded-xl border border-[var(--border-strong)] bg-white text-[var(--text)] text-[14.5px] font-semibold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            Only need part of this unit?
          </button>
        )}

        {showSubsetPicker && subsetOpen && (
          <div className="rounded-xl border border-[var(--border)] bg-stone-50 p-3 space-y-2">
            <button type="button" onClick={() => setSubsetOpen(false)}
              className="w-full flex items-center justify-between">
              <div className="text-[12px] font-semibold text-[var(--text)]">What do you need?</div>
              <span className="text-[11px] font-semibold text-[var(--ordered)]">{subsetLabel[subset]} <span className="text-[10px]">▲</span></span>
            </button>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              {([
                { value: 'full',    label: 'Full unit' },
                { value: 'door',    label: doorMatch ? `Door only · ${doorMatch.sapCode}` : 'Door only' },
                { value: 'carcase', label: 'Carcase only' },
                { value: 'shelf',   label: 'Shelf' },
                { value: 'other',   label: 'Other' },
              ] as { value: Subset; label: string }[]).map(opt => {
                const selected = subset === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => applySubset(opt.value)}
                    className={`shrink-0 h-9 px-3.5 text-[13px] font-semibold rounded-full border transition-colors ${
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
              <p className="mt-1 text-[11.5px] text-[var(--subtle)]">
                No matching door in this kitchen — add an optional note below if needed.
              </p>
            )}
          </div>
        )}

        {!fromKitchen && (
          <label className="block">
            <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Description</span>
            <div className="mt-1">
              <DescriptionTypeahead
                value={description}
                onChange={(desc, sap) => { setDescription(desc); setSapCode(sap); }}
              />
            </div>
          </label>
        )}

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

        {fromKitchen && (
          <div>
            {!noteOpen && !description.trim() ? (
              <button type="button" onClick={() => setNoteOpen(true)}
                className="text-[12.5px] font-semibold text-[var(--action)] hover:underline">
                + Add a note (optional)
              </button>
            ) : (
              <label className="block">
                <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Note <span className="text-[var(--faint)] font-normal lowercase normal-case">(optional)</span></span>
                <div className="mt-1">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add any extra detail for the office team…"
                    className="w-full min-h-[64px] px-3 py-2 text-[14px] rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:border-[var(--text)] resize-y"
                  />
                </div>
              </label>
            )}
          </div>
        )}

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
