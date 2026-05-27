import { Ticket } from '@shared/types';

export function countByStatus(tickets: Ticket[]) {
  return {
    inbox:   tickets.filter(t => t.status === 'pending' && !t.accepted_at).length,
    pending: tickets.filter(t => t.status === 'pending' && !!t.accepted_at).length,
    query:   tickets.filter(t => t.status === 'query').length,
    ordered: tickets.filter(t => t.status === 'ordered').length,
  };
}

export function unreadInQueue(tickets: Ticket[], queue: string) {
  if (queue === 'inbox')   return tickets.filter(t => t.status === 'pending' && !t.accepted_at).reduce((n, t) => n + (t.unread_count ?? 0), 0);
  if (queue === 'pending') return tickets.filter(t => t.status === 'pending' && !!t.accepted_at).reduce((n, t) => n + (t.unread_count ?? 0), 0);
  return tickets.filter(t => t.status === queue).reduce((n, t) => n + (t.unread_count ?? 0), 0);
}
