import React, { useState } from 'react';
import { DeliveryRequest, LineItemInput } from '@shared/types';
import FormSection from './FormSection';
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
const INITIAL_ROWS = 1;
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

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-36">
      <div className="card p-4 space-y-6 animate-slide-up">
        <h2 className="text-lg font-bold">New Report</h2>
        <FormSection label="Where is the job?">
          <DeveloperCombobox value={developer} onChange={setDeveloper} disabled={disabled} />
          <input className="input-field" placeholder="Site *" maxLength={100} value={site}
            onChange={e => setSite(e.target.value)} disabled={disabled} required />
          <input className="input-field" placeholder="Plot Number *" maxLength={50} value={plotNumber}
            onChange={e => setPlotNumber(e.target.value)} disabled={disabled} required />
        </FormSection>
        <FormSection label="What needs remedial?">
          <LineItemBuilder items={items} onChange={setItems} disabled={disabled} />
        </FormSection>
        <FormSection label="When should it arrive?">
          <DeliverySection deliveryType={deliveryType} deliveryDate={deliveryDate}
            onTypeChange={setDeliveryType} onDateChange={setDeliveryDate} disabled={disabled} />
        </FormSection>
        <FormSection label="Photos (optional)">
          <PhotoUpload images={images} onChange={setImages} disabled={disabled} />
        </FormSection>
      </div>
      <div className="fixed left-0 right-0 p-4 glass border-t border-[var(--border)] max-w-lg mx-auto z-20"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
        <button type="submit" disabled={!canSubmit || submitting || disabled}
          className="btn-accent w-full flex items-center justify-center gap-2">
          {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}
