import { createPortal } from 'react-dom';
import { LineItemInput, DeliveryRequest } from '@shared/types';
import { REASON_LABEL } from '../constants/reasons';

interface Props {
  open: boolean;
  developer: string;
  site: string;
  plot: string;
  items: LineItemInput[];
  deliveryType: 'next_delivery' | 'specific_date' | '';
  deliveryDate: string;
  photoCount: number;
  submitting: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSend: () => void;
}

function isFilled(r: LineItemInput): boolean {
  return r.description.trim().length > 0 && r.quantity >= 1 && r.reason !== '';
}

export default function ReviewSheet({
  open, developer, site, plot, items, deliveryType, deliveryDate, photoCount,
  submitting, onEdit, onClose, onSend,
}: Props) {
  if (!open) return null;

  const filledItems = items.filter(isFilled);
  const issues: string[] = [];
  if (!developer.trim()) issues.push('Developer is empty');
  if (!site.trim()) issues.push('Site is empty');
  if (!plot.trim()) issues.push('Plot number is empty');
  if (filledItems.length === 0) issues.push('No items added (need at least one)');
  if (!deliveryType) issues.push('Delivery preference not set');
  if (deliveryType === 'specific_date' && !deliveryDate) issues.push('Delivery date not picked');

  const canSend = issues.length === 0 && !submitting;
  const deliveryLabel = deliveryType === 'next_delivery'
    ? 'Next delivery'
    : deliveryType === 'specific_date'
      ? (deliveryDate || 'Date not set')
      : 'Not set';

  return createPortal((
    <div
      className="app-fieldrem fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-modal-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)] m-0">Review remedial</h2>
          <button onClick={onClose} className="text-[var(--subtle)] hover:text-[var(--text)] text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Section title="Where" onEdit={onEdit}>
            <KV label="Developer" value={developer || '—'} />
            <KV label="Site"      value={site || '—'} />
            <KV label="Plot"      value={plot || '—'} />
          </Section>

          <Section title={`What — ${filledItems.length} item${filledItems.length === 1 ? '' : 's'}`} onEdit={onEdit}>
            {filledItems.length === 0 && (
              <p className="text-[13px] text-[var(--subtle)]">No items added.</p>
            )}
            {filledItems.map((item, i) => (
              <div key={i} className="py-2 border-b border-[var(--border)] last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  {item.sap_code ? (
                    <span className="font-mono text-[13.5px] font-semibold text-[var(--text)]">{item.sap_code}</span>
                  ) : (
                    <span className="text-[13.5px] font-semibold text-[var(--text)]">{item.description}</span>
                  )}
                  <span className="text-[11.5px] text-[var(--subtle)] tabular-nums shrink-0">× {item.quantity}</span>
                </div>
                {item.sap_code && item.description && (
                  <p className="text-[12.5px] text-[var(--subtle)] mt-0.5 leading-tight">{item.description}</p>
                )}
                <p className="text-[11.5px] text-[var(--ordered)] mt-1 font-medium">
                  {REASON_LABEL[item.reason] || item.reason}
                </p>
              </div>
            ))}
          </Section>

          <Section title="When" onEdit={onEdit}>
            <KV label="Delivery" value={deliveryLabel} />
          </Section>

          <Section title="Photos" onEdit={onEdit}>
            <p className="text-[13px] text-[var(--text)]">{photoCount} photo{photoCount === 1 ? '' : 's'}</p>
          </Section>

          {issues.length > 0 && (
            <div className="rounded-lg border border-[var(--query)] bg-red-50 px-3 py-2.5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--query)] mb-1">Before sending</p>
              <ul className="text-[13px] text-[var(--text)] space-y-0.5 list-disc list-inside">
                {issues.map(msg => <li key={msg}>{msg}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[48px] rounded-xl font-semibold text-[var(--text)] bg-white border border-[var(--border)] disabled:opacity-50">
            Back to edit
          </button>
          <button type="button" onClick={onSend} disabled={!canSend}
            className="flex-[2] min-h-[48px] rounded-xl font-semibold text-white bg-[var(--text)] hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Sending…' : 'Send to office'}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

function Section({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--muted)]">{title}</h3>
        <button onClick={onEdit} type="button" className="text-[11.5px] font-semibold text-[var(--action)] hover:underline">Edit</button>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-[11.5px] text-[var(--subtle)]">{label}</span>
      <span className="text-[13.5px] text-[var(--text)] font-medium truncate ml-3">{value}</span>
    </div>
  );
}
