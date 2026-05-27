interface Props {
  step: number;
  canNext: boolean;
  canSubmit: boolean;
  submitting: boolean;
  disabled: boolean;
  onBack: () => void;
  onNext: () => void;
}

export default function FormWizardBar({ step, canNext, canSubmit, submitting, disabled, onBack, onNext }: Props) {
  const isLast = step === 3;

  return (
    <div className="fixed left-0 right-0 p-4 glass border-t border-[var(--border)] max-w-lg mx-auto z-20 flex gap-2"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
      {step > 0 && (
        <button type="button" onClick={onBack} disabled={disabled || submitting}
          className="btn-secondary flex-1">Back</button>
      )}
      {isLast ? (
        <button type="submit" disabled={!canSubmit || submitting || disabled}
          className="btn-accent flex-[2] flex items-center justify-center gap-2">
          {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      ) : (
        <button type="button" onClick={onNext} disabled={!canNext || disabled}
          className="btn-accent flex-[2]">Continue</button>
      )}
    </div>
  );
}
