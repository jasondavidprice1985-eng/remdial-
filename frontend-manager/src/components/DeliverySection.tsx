interface Props {
  deliveryType: 'next_delivery' | 'specific_date' | '';
  deliveryDate: string;
  onTypeChange: (t: 'next_delivery' | 'specific_date') => void;
  onDateChange: (d: string) => void;
  disabled: boolean;
}

export default function DeliverySection({ deliveryType, deliveryDate, onTypeChange, onDateChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex p-1 rounded-xl bg-stone-100 border border-[var(--border)]">
        {(['next_delivery', 'specific_date'] as const).map(type => (
          <button key={type} type="button" disabled={disabled} onClick={() => onTypeChange(type)}
            className={`flex-1 py-3 text-base font-semibold rounded-lg transition-all min-h-[48px] ${
              deliveryType === type ? 'bg-[var(--action)] text-white shadow-sm' : 'text-[var(--muted)]'
            }`}>
            {type === 'next_delivery' ? 'Next Delivery' : 'Specific Date'}
          </button>
        ))}
      </div>
      {deliveryType === 'specific_date' && (
        <input type="date" className="input-field" value={deliveryDate}
          onChange={e => onDateChange(e.target.value)} disabled={disabled} required />
      )}
    </div>
  );
}
