import React, { useState } from 'react';
import { DeliveryRequest, LineItemInput } from '@shared/types';
import FormSection from './FormSection';
import DeveloperCombobox from './DeveloperCombobox';
import LineItemBuilder from './LineItemBuilder';
import DeliverySection from './DeliverySection';
import PhotoUpload from './PhotoUpload';
import FormProgress from './FormProgress';
import FormWizardBar from './FormWizardBar';

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

export default function TicketForm({ onSubmit, submitting, disabled }: Props) {
  const [step, setStep] = useState(0);
  const [developer, setDeveloper] = useState('');
  const [site, setSite] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([{ ...EMPTY }]);
  const [deliveryType, setDeliveryType] = useState<'next_delivery' | 'specific_date' | ''>('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const locationDone = !!(developer.trim() && site.trim() && plotNumber.trim());
  const itemsValid = items.every(r => r.description.trim() && r.quantity >= 1 && r.reason);
  const deliveryDone = !!(deliveryType && (deliveryType === 'next_delivery' || deliveryDate));
  const canSubmit = locationDone && itemsValid && deliveryDone;

  const stepValid = [locationDone, itemsValid, deliveryDone, true][step];

  function resetForm() {
    setStep(0); setDeveloper(''); setSite(''); setPlotNumber('');
    setItems([{ ...EMPTY }]); setDeliveryType(''); setDeliveryDate(''); setImages([]);
  }
  React.useEffect(() => {
    (window as Window & { __resetTicketForm?: () => void }).__resetTicketForm = resetForm;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !deliveryType) return;
    onSubmit({
      developer: developer.trim(), site: site.trim(), plot_number: plotNumber.trim(),
      items: items.map(r => ({ ...r, description: r.description.trim() })),
      delivery_request: { type: deliveryType, date: deliveryType === 'specific_date' ? deliveryDate : null },
      images,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-36">
      <div className="card p-4 space-y-5 animate-slide-up">
        <h2 className="text-lg font-bold">New Report</h2>
        <FormProgress step={step} locationDone={locationDone} itemsDone={itemsValid} deliveryDone={deliveryDone} />
        {step === 0 && (
          <FormSection label="Where is the job?">
            <DeveloperCombobox value={developer} onChange={setDeveloper} disabled={disabled} />
            <input className="input-field" placeholder="Site *" maxLength={100} value={site}
              onChange={e => setSite(e.target.value)} disabled={disabled} required />
            <input className="input-field" placeholder="Plot Number *" maxLength={50} value={plotNumber}
              onChange={e => setPlotNumber(e.target.value)} disabled={disabled} required />
          </FormSection>
        )}
        {step === 1 && (
          <FormSection label="What needs remedial?">
            <LineItemBuilder items={items} onChange={setItems} disabled={disabled} />
          </FormSection>
        )}
        {step === 2 && (
          <FormSection label="When should it arrive?">
            <DeliverySection deliveryType={deliveryType} deliveryDate={deliveryDate}
              onTypeChange={setDeliveryType} onDateChange={setDeliveryDate} disabled={disabled} />
          </FormSection>
        )}
        {step === 3 && (
          <FormSection label="Photos (optional)">
            <PhotoUpload images={images} onChange={setImages} disabled={disabled} />
          </FormSection>
        )}
      </div>
      <FormWizardBar step={step} canNext={stepValid} canSubmit={canSubmit} submitting={submitting}
        disabled={disabled} onBack={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
    </form>
  );
}
