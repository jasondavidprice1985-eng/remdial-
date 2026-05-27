const STEP_LABELS = ['Location', 'Items', 'Delivery', 'Photos'];

interface Props {
  step: number;
  locationDone: boolean;
  itemsDone: boolean;
  deliveryDone: boolean;
}

export default function FormProgress({ step, locationDone, itemsDone, deliveryDone }: Props) {
  const done = [locationDone, itemsDone, deliveryDone, true];

  return (
    <div className="mb-1">
      <p className="text-sm font-semibold text-[var(--text)] mb-1">
        Step {step + 1} of 4 — {STEP_LABELS[step]}
      </p>
      <div className="flex gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[var(--action)]' : 'bg-stone-200'}`} />
            <span className={`block text-[10px] mt-1 font-medium truncate ${i === step ? 'text-[var(--action)]' : done[i] ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
