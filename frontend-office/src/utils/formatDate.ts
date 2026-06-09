export function fmtDateUK(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London',
  });
}

export function fmtDateTimeUK(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/London',
  });
}
