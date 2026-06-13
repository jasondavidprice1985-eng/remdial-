import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../auth/apiClient';

export interface KitchenItem {
  salesDoc: string;
  salesType: string | null;
  sapCode: string;
  description: string | null;
  quantity: number | null;
  poNumber: string | null;
  plot: string | null;
}

interface Props {
  developer: string;
  site: string;
  plot: string;
  open: boolean;
  onClose: () => void;
  onPick: (item: KitchenItem) => void;
}

// Map a SAP code prefix to a coarse family name for grouping. Mirrors the
// backend decoder's prefix table — keep these in sync.
function familyOf(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith('HINGE'))     return 'Hinges';
  if (upper.startsWith('LTS'))       return 'Lights';
  if (upper.startsWith('VENTGRILL')) return 'Vents';
  if (upper.startsWith('SPLASH'))    return 'Splashbacks';
  if (upper.startsWith('FITTING'))   return 'Fittings';
  if (upper.startsWith('SSK'))       return 'Sinks';
  if (upper.startsWith('CAP'))       return 'Cover caps';
  if (upper.startsWith('ESP'))       return 'Carcase panels';
  if (upper.startsWith('MPP'))       return 'Carcase panels';
  if (upper.startsWith('TF'))        return 'Carcase panels';
  if (upper.startsWith('BBBP'))      return 'Carcase panels';
  if (upper.startsWith('PL'))        return 'Plinths';
  if (upper.startsWith('ET'))        return 'Edging';
  if (upper.startsWith('TH'))        return 'Worktops / sheets';
  if (upper.startsWith('APP') || upper.startsWith('APF')) return 'Appliances';
  if (upper.startsWith('BW'))        return 'Base / wall';
  if (upper.startsWith('BU') || upper.startsWith('BC') || upper.startsWith('B')) return 'Base units';
  if (upper.startsWith('TWU') || upper.startsWith('TW') || upper.startsWith('T')) return 'Tall units';
  if (upper.startsWith('WM') || upper.startsWith('W')) return 'Wall units';
  if (upper.startsWith('PD'))        return 'Drawers';
  if (upper.startsWith('D'))         return 'Doors';
  if (upper.startsWith('H'))         return 'Handles';
  return 'Other';
}

const FAMILY_ORDER = [
  'Carcase panels', 'Base units', 'Wall units', 'Tall units', 'Base / wall',
  'Doors', 'Drawers', 'Appliances', 'Worktops / sheets', 'Splashbacks',
  'Sinks', 'Handles', 'Plinths', 'Edging', 'Cover caps', 'Fittings',
  'Hinges', 'Lights', 'Vents', 'Other',
];

export default function KitchenPicker({ developer, site, plot, open, onClose, onPick }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError(null); setItems([]); setQuery('');
    const q = new URLSearchParams({ developer, site, plot }).toString();
    apiFetch(`/sap/kitchen?${q}`)
      .then(async r => {
        if (r.status === 404) throw new Error('Kitchen lookup is currently disabled');
        if (!r.ok) throw new Error('Could not look up kitchen');
        const data = await r.json();
        setItems(data.items || []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [open, developer, site, plot]);

  if (!open) return null;

  const lowered = query.trim().toLowerCase();
  const filtered = lowered
    ? items.filter(i =>
        i.sapCode.toLowerCase().includes(lowered) ||
        (i.description || '').toLowerCase().includes(lowered))
    : items;

  // Group by family, then sort families in canonical order
  const groups = new Map<string, KitchenItem[]>();
  for (const item of filtered) {
    const family = familyOf(item.sapCode);
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family)!.push(item);
  }
  const sortedGroups = FAMILY_ORDER
    .map(name => [name, groups.get(name)] as [string, KitchenItem[] | undefined])
    .filter(([, list]) => list && list.length > 0) as [string, KitchenItem[]][];

  return createPortal((
    <div
      className="app-fieldrem fixed inset-0 z-40 bg-black/40 flex items-center justify-center animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-modal-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)] m-0">Kitchen for plot {plot}</h2>
            <p className="text-[12px] text-[var(--subtle)] mt-0.5 truncate">{developer} · {site}</p>
          </div>
          <button onClick={onClose} className="text-[var(--subtle)] hover:text-[var(--text)] text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>

        <div className="px-5 pt-3 pb-2">
          <input
            type="search"
            placeholder="Search code or description…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[14px] text-[var(--text)] focus:outline-none focus:border-[var(--text)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading && (
            <div className="px-2 py-8 text-center text-[13px] text-[var(--subtle)]">Loading kitchen…</div>
          )}
          {error && !loading && (
            <div className="px-2 py-6 text-center text-[13px] text-[var(--query)]">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="px-2 py-8 text-center text-[13px] text-[var(--subtle)]">
              No matching kitchen found for plot <strong>{plot}</strong>.<br />
              Use the manual item entry below instead.
            </div>
          )}
          {!loading && !error && items.length > 0 && filtered.length === 0 && (
            <div className="px-2 py-8 text-center text-[13px] text-[var(--subtle)]">
              No items match "{query}"
            </div>
          )}
          {!loading && !error && sortedGroups.map(([family, list]) => (
            <div key={family} className="mt-3">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                {family} <span className="text-[var(--faint)]">· {list.length}</span>
              </div>
              <div className="space-y-1.5">
                {list.map((item, i) => (
                  <button
                    key={`${item.salesDoc}-${item.sapCode}-${i}`}
                    type="button"
                    onClick={() => onPick(item)}
                    className="w-full text-left p-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[13px] font-semibold text-[var(--text)]">{item.sapCode}</span>
                      <span className="text-[11.5px] text-[var(--subtle)] tabular-nums shrink-0">× {item.quantity ?? 1}</span>
                    </div>
                    <div className="text-[12.5px] text-[var(--subtle)] mt-0.5 leading-tight">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ), document.body);
}
