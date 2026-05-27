import { Ticket } from '@shared/types';
import { ticketNeedsAttention } from './ticketAttention';

export function sortTickets(tickets: Ticket[], respondedQueries: Set<string> = new Set()): Ticket[] {
  function priority(t: Ticket): number {
    if (ticketNeedsAttention(t, respondedQueries)) return 0;
    if (t.status === 'query') return 1;
    if (t.status === 'ordered') return 2;
    return 3;
  }
  return [...tickets].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
