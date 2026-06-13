import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DeliveryRequest, LineItemInput } from '@shared/types';
import FormSection, { CompleteTag } from './FormSection';
import DeveloperCombobox from './DeveloperCombobox';
import LineItemBuilder from './LineItemBuilder';
import DeliverySection from './DeliverySection';
import PhotoUpload from './PhotoUpload';
import KitchenPicker, { KitchenItem } from './KitchenPicker';
import SapCombobox from './SapCombobox';
import ReviewSheet from './ReviewSheet';
import { apiFetch } from '../auth/apiClient';

const SAP_DECODER_ENABLED = import.meta.env.VITE_SAP_DECODER_ENABLED === 'true';

export interface TicketFormPayload {
  developer: string; site: string; plot_number: string;
  items: LineItemInput[]; delivery_request: DeliveryRequest; images: string[];
}

interface Props {
  onSubmit: (payload: TicketFormPayload) => void;
  submitting: boolean;
  disabled: boolean;
  /** Whether this form is the visible swipe panel. The portaled submit
   *  footer only renders while it is, otherwise it would show on the
   *  Tickets and Archive tabs too. */
  isActive: boolean;
}

const EMPTY: LineItemInput = { description: '', quantity: 1, reason: '' };
const INITIAL_ROWS = 1;
const makeInitialItems = (): LineItemInput[] =>
  Array.from({ length: INITIAL_ROWS }, () => ({ ...EMPTY }));
const isFilled = (r: LineItemInput): boolean =>
  r.description.trim().length > 0 && r.quantity >= 1 && r.reason !== '';

export default function TicketForm({ onSubmit, submitting, disabled, isActive }: Props) {
  const [developer, setDeveloper] = useState('');
  const [site, setSite] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [items, setItems] = useState<LineItemInput[]>(makeInitialItems);
  const [deliveryType, setDeliveryType] = useState<'next_delivery' | 'specific_date' | ''>('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [kitchenItems, setKitchenItems] = useState<KitchenItem[] | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const locationDone = !!(developer.trim() && site.trim() && plotNumber.trim());
  const filledItems = items.filter(isFilled);
  const itemsValid = filledItems.length > 0;
  const deliveryDone = !!(deliveryType && (deliveryType === 'next_delivery' || deliveryDate));
  const canSubmit = locationDone && itemsValid && deliveryDone;

  function resetForm() {
    setDeveloper(''); setSite(''); setPlotNumber('');
    setItems(makeInitialItems()); setDeliveryType(''); setDeliveryDate(''); setImages([]);
    setKitchenOpen(false); setEditingItemIndex(null); setKitchenItems(null);
    setReviewOpen(false);
  }

  // When SAP flag is on and all three fields are filled, load the kitchen
  // items once so both the picker and the line-item editor can use them.
  useEffect(() => {
    if (!SAP_DECODER_ENABLED) return;
    if (!developer.trim() || !site.trim() || !plotNumber.trim()) {
      setKitchenItems(null);
      return;
    }
    const controller = new AbortController();
    const q = new URLSearchParams({ developer: developer.trim(), site: site.trim(), plot: plotNumber.trim() }).toString();
    apiFetch(`/sap/kitchen?${q}`, { signal: controller.signal })
      .then(async r => { if (r.ok) { const data = await r.json(); setKitchenItems(data.items || []); } })
      .catch(() => { /* ignore */ });
    return () => controller.abort();
  }, [developer, site, plotNumber]);

  const kitchenItemCount = kitchenItems?.length ?? null;

  function handleKitchenPick(item: KitchenItem) {
    const description = item.description || item.sapCode;
    let targetIndex = -1;
    setItems(prev => {
      const empty = prev.findIndex(r => r.description.trim() === '');
      const patch: LineItemInput = {
        description,
        quantity: item.quantity ?? 1,
        reason: '',
        sap_code: item.sapCode,
      };
      if (empty === -1) {
        targetIndex = prev.length;
        return [...prev, patch];
      }
      targetIndex = empty;
      return prev.map((r, i) => i === empty ? patch : r);
    });
    setKitchenOpen(false);
    // Open the line-item editor so the manager just has to pick the reason
    setTimeout(() => setEditingItemIndex(targetIndex), 100);
  }
  React.useEffect(() => {
    (window as Window & { __resetTicketForm?: () => void }).__resetTicketForm = resetForm;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The form's submit button now opens the review sheet — the actual
    // send happens from inside the sheet.
    setReviewOpen(true);
  }

  function sendForReal() {
    if (!canSubmit || !deliveryType) return;
    onSubmit({
      developer: developer.trim(), site: site.trim(), plot_number: plotNumber.trim(),
      items: filledItems.map(r => ({ ...r, description: r.description.trim() })),
      delivery_request: { type: deliveryType, date: deliveryType === 'specific_date' ? deliveryDate : null },
      images,
    });
    setReviewOpen(false);
  }

  const photosCount = images.length;

  return (
    <form onSubmit={handleSubmit} className="pb-10">
      <div className="px-5">
        <FormSection
          step={1}
          eyebrow="Where"
          label="Where?"
          aux={<CompleteTag done={locationDone} />}
        >
          {SAP_DECODER_ENABLED ? (
            <>
              <SapCombobox
                value={developer}
                onChange={v => { setDeveloper(v); setSite(''); setPlotNumber(''); }}
                placeholder="Developer *"
                disabled={disabled}
                required
                buildUrl={q => `/sap/developers?q=${encodeURIComponent(q)}`}
              />
              <SapCombobox
                value={site}
                onChange={v => { setSite(v); setPlotNumber(''); }}
                placeholder="Site *"
                disabled={disabled || !developer.trim()}
                required
                buildUrl={q => developer.trim()
                  ? `/sap/sites?developer=${encodeURIComponent(developer.trim())}&q=${encodeURIComponent(q)}`
                  : null}
                deps={[developer]}
              />
              <SapCombobox
                value={plotNumber}
                onChange={setPlotNumber}
                placeholder="Plot Number *"
                disabled={disabled || !developer.trim() || !site.trim()}
                required
                buildUrl={q => (developer.trim() && site.trim())
                  ? `/sap/plots?developer=${encodeURIComponent(developer.trim())}&site=${encodeURIComponent(site.trim())}&q=${encodeURIComponent(q)}`
                  : null}
                deps={[developer, site]}
              />
            </>
          ) : (
            <>
              <DeveloperCombobox value={developer} onChange={setDeveloper} disabled={disabled} />
              <input className="input-field" placeholder="Site *" maxLength={100} value={site}
                onChange={e => setSite(e.target.value)} disabled={disabled} required />
              <input className="input-field" placeholder="Plot Number *" maxLength={50} value={plotNumber}
                onChange={e => setPlotNumber(e.target.value)} disabled={disabled} required />
            </>
          )}
        </FormSection>

        {SAP_DECODER_ENABLED && locationDone && kitchenItemCount !== null && kitchenItemCount > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setKitchenOpen(true)}
              disabled={disabled}
              className="w-full h-12 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] text-[14px] font-semibold flex items-center justify-center gap-2 hover:border-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5 12 4l9 5.5" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" />
              </svg>
              Pick from kitchen <span className="text-[var(--subtle)] font-normal">· {kitchenItemCount} items</span>
            </button>
          </div>
        )}
        {SAP_DECODER_ENABLED && locationDone && kitchenItemCount === 0 && (
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-stone-50 border border-[var(--border)] text-[12.5px] text-[var(--subtle)]">
            No kitchen on record for plot {plotNumber.trim()} — add items manually below.
          </div>
        )}

        <FormSection
          step={2}
          eyebrow="What"
          label="What's needed and why?"
          aux={<CompleteTag done={itemsValid} label={itemsValid ? `${filledItems.length} item${filledItems.length === 1 ? '' : 's'}` : '0 items'} />}
        >
          <LineItemBuilder items={items} onChange={setItems} disabled={disabled}
            openIndex={editingItemIndex} onOpenIndexChange={setEditingItemIndex}
            kitchenItems={SAP_DECODER_ENABLED ? (kitchenItems ?? undefined) : undefined} />
        </FormSection>

        <FormSection
          step={3}
          eyebrow="When"
          label="When should it arrive?"
          aux={<CompleteTag done={deliveryDone} />}
        >
          <DeliverySection deliveryType={deliveryType} deliveryDate={deliveryDate}
            onTypeChange={setDeliveryType} onDateChange={setDeliveryDate} disabled={disabled} />
        </FormSection>

        <FormSection
          step={4}
          eyebrow="Photos"
          label="Photos"
          aux={<CompleteTag label={photosCount > 0 ? `${photosCount} photo${photosCount === 1 ? '' : 's'}` : 'Optional'} done={photosCount > 0} />}
        >
          <PhotoUpload images={images} onChange={setImages} disabled={disabled} />
        </FormSection>
      </div>

      {isActive && createPortal((
        <div className="app-fieldrem fixed left-0 right-0 max-w-lg mx-auto z-20 bg-[var(--surface)] border-t border-[var(--border)] px-5 pt-3 pb-3"
          style={{ bottom: 'calc(3.625rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between text-[12px] text-[var(--subtle)] mb-2.5 tabular-nums">
            <span>
              {filledItems.length} item{filledItems.length === 1 ? '' : 's'} · {photosCount} photo{photosCount === 1 ? '' : 's'}
            </span>
            <span className="text-[var(--faint)]">
              {!canSubmit ? (
                <>
                  {!locationDone && "Fill in location"}
                  {locationDone && !itemsValid && "Add items"}
                  {locationDone && itemsValid && !deliveryDone && "Set delivery"}
                </>
              ) : "Sending to office"}
            </span>
          </div>
          <button type="button" onClick={() => setReviewOpen(true)} disabled={submitting || disabled || !canSubmit}
            className="w-full h-[52px] rounded-lg bg-[var(--text)] text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              : <>Review &amp; submit
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </>
            }
          </button>
        </div>
      ), document.body)}

      {SAP_DECODER_ENABLED && (
        <KitchenPicker
          developer={developer.trim()}
          site={site.trim()}
          plot={plotNumber.trim()}
          open={kitchenOpen}
          onClose={() => setKitchenOpen(false)}
          onPick={handleKitchenPick}
        />
      )}

      <ReviewSheet
        open={reviewOpen}
        developer={developer}
        site={site}
        plot={plotNumber}
        items={items}
        deliveryType={deliveryType}
        deliveryDate={deliveryDate}
        photoCount={photosCount}
        submitting={submitting}
        onEdit={() => setReviewOpen(false)}
        onClose={() => setReviewOpen(false)}
        onSend={sendForReal}
      />
    </form>
  );
}
