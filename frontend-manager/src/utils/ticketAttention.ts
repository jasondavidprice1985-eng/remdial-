import { Ticket } from '@shared/types';

const STORAGE_KEY = 'fieldrem_responded_queries';

export function loadRespondedQueries(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveRespondedQueries(ids: Set<string>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** Manager must act: unread office messages, or query not yet replied to. */
export function ticketNeedsAttention(ticket: Ticket, respondedQueries: Set<string>): boolean {
  if ((ticket.unread_count ?? 0) > 0) return true;
  if (ticket.status === 'query' && !respondedQueries.has(ticket.id)) return true;
  return false;
}

export function countNeedingAttention(tickets: Ticket[], respondedQueries: Set<string>): number {
  return tickets.filter(t => ticketNeedsAttention(t, respondedQueries)).length;
}

export function isWaitingForOffice(ticket: Ticket, respondedQueries: Set<string>): boolean {
  return ticket.status === 'query'
    && respondedQueries.has(ticket.id)
    && (ticket.unread_count ?? 0) === 0;
}
