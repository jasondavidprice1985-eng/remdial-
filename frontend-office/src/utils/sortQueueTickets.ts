import { Ticket } from '@shared/types';

export function sortQueueTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const ua = a.unread_count ?? 0;
    const ub = b.unread_count ?? 0;
    if (ua !== ub) return ub - ua;
    if (a.status === 'query' && b.status !== 'query') return -1;
    if (b.status === 'query' && a.status !== 'query') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
