export function fmtDateUK(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London',
  });
}
