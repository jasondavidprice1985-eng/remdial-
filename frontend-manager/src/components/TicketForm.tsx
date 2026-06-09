import React, { useState } from 'react';
import { DeliveryRequest, LineItemInput } from '@shared/types';
import FormSection, { CompleteTag } from './FormSection';
import DeveloperCombobox from './DeveloperCombobox';
import LineItemBuilder from './LineItemBuilder';
import DeliverySection from './DeliverySection';
import PhotoUpload from './PhotoUpload';

export interface TicketFormPayload {
  developer: string; site: string; plot_number: string;
  items: LineItemInput[]; delivery_request: DeliveryRequest; images: string[];
}

interface Props {
  onSubmit: (payload: TicketFormPayload) => void;
  submitting: boolean;
  disabled: boolean;
}

const EMPTY: LineItemInput = { description: '', quantity: 1, reason: '' };
const INITIAL_ROWS = 5;
const makeInitialItems = (): LineItemInput[] =>
  Array.from({ length: INITIAL_ROWS }, () => ({ ...EMPTY }));
const isFilled = (r: LineItemInput): boolean =>
  r.description.trim().length > 0 && r.quantity >= 1 && r.reason !== '';

export default function TicketForm({ onSubmit, submitting, disabled }: Props) {
  const [developer, setDeveloper] = useState('');
  const [site, setSite] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [items, setItems] = useState<LineItemInput[]>(makeInitialItems);
  const [deliveryType, setDeliveryType] = useState<'next_delivery' | 'specific_date' | ''>('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const locationDone = !!(developer.trim() && site.trim() && plotNumber.trim());
  const filledItems = items.filter(isFilled);
  const itemsValid = filledItems.length > 0;
  const deliveryDone = !!(deliveryType && (deliveryType === 'next_delivery' || deliveryDate));
  const canSubmit = locationDone && itemsValid && deliveryDone;

  function resetForm() {
    setDeveloper(''); setSite(''); setPlotNumber('');
    setItems(makeInitialItems()); setDeliveryType(''); setDeliveryDate(''); setImages([]);
  }
  React.useEffect(() => {
    (window as Window & { __resetTicketForm?: () => void }).__resetTicketForm = resetForm;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !deliveryType) return;
    onSubmit({
      developer: developer.trim(), site: site.trim(), plot_number: plotNumber.trim(),
      items: filledItems.map(r => ({ ...r, description: r.description.trim() })),
      delivery_request: { type: deliveryType, date: deliveryType === 'specific_date' ? deliveryDate : null },
      images,
    });
  }

  const photosCount = images.length;

  return (
    <form onSubmit={handleSubmit} className="pb-36">
      <div className="px-5 pt-2 pb-1">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-[var(--text)] m-0">New report</h1>
        <p className="text-[12.5px] text-[var(--ordered)] mt-1 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ordered)]" />
          Saved as draft
        </p>
      </div>

      <div className="px-5">
        <FormSection
          step={1}
          eyebrow="Where"
          label="Where is the job?"
          aux={<CompleteTag done={locationDone} />}
        >
          <DeveloperCombobox value={developer} onChange={setDeveloper} disabled={disabled} />
          <input className="input-field" placeholder="Site *" maxLength={100} value={site}
            onChange={e => setSite(e.target.value)} disabled={disabled} required />
          <input className="input-field" placeholder="Plot Number *" maxLength={50} value={plotNumber}
            onChange={e => setPlotNumber(e.target.value)} disabled={disabled} required />
        </FormSection>

        <FormSection
          step={2}
          eyebrow="What"
          label="What needs remedial?"
          aux={<CompleteTag done={itemsValid} label={itemsValid ? `${filledItems.length} item${filledItems.length === 1 ? '' : 's'}` : '0 items'} />}
        >
          <LineItemBuilder items={items} onChange={setItems} disabled={disabled} />
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
          label="Photos & voice note"
          aux={<CompleteTag label={photosCount > 0 ? `${photosCount} photo${photosCount === 1 ? '' : 's'}` : 'Optional'} done={photosCount > 0} />}
        >
          <PhotoUpload images={images} onChange={setImages} disabled={disabled} />
        </FormSection>
      </div>

      <div className="fixed left-0 right-0 max-w-lg mx-auto z-20 bg-[var(--surface)] border-t border-[var(--border)] px-5 pt-3 pb-3"
        style={{ bottom: 'calc(3.625rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between text-[12px] text-[var(--subtle)] mb-2.5 tabular-nums">
          <span>
            {filledItems.length} item{filledItems.length === 1 ? '' : 's'} · {photosCount} photo{photosCount === 1 ? '' : 's'}
          </span>
          <span className="text-[var(--faint)]">Sending to office</span>
        </div>
        <button type="submit" disabled={!canSubmit || submitting || disabled}
          className="w-full h-12 rounded-lg bg-[var(--text)] text-white text-[14.5px] font-semibold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting
            ? 'Submitting…'
            : <>Submit report
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </>
          }
        </button>
      </div>
    </form>
  );
}
