import { TicketReason } from '@shared/types';

export const REASONS: { value: TicketReason; label: string }[] = [
  { value: 'damaged_on_arrival',  label: 'Damaged on Arrival' },
  { value: 'missing_omission',    label: 'Missing / Omission' },
  { value: 'wrong_specification', label: 'Wrong Specification' },
  { value: 'site_loss',           label: 'Site Loss' },
];

export const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REASONS.map(r => [r.value, r.label])
);
