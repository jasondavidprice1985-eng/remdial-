import { useState, useCallback } from 'react';
import { Ticket } from '@shared/types';
import { loadRespondedQueries, saveRespondedQueries, countNeedingAttention } from '../utils/ticketAttention';

export function useRespondedQueries() {
  const [respondedQueries, setRespondedQueries] = useState(() => loadRespondedQueries());

  const syncResponded = useCallback((ticket: Ticket) => {
    setRespondedQueries(prev => {
      let next = prev;
      if ((ticket.unread_count ?? 0) > 0 && prev.has(ticket.id)) {
        next = new Set(prev);
        next.delete(ticket.id);
      }
      if (ticket.status !== 'query' && prev.has(ticket.id)) {
        next = next === prev ? new Set(prev) : next;
        next.delete(ticket.id);
      }
      if (next === prev) return prev;
      saveRespondedQueries(next);
      return next;
    });
  }, []);

  const handleTicketUpdate = useCallback((ticket: Ticket, setTickets: (fn: (prev: Ticket[]) => Ticket[]) => void) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    syncResponded(ticket);
  }, [syncResponded]);

  const handleManagerResponded = useCallback((ticketId: string) => {
    setRespondedQueries(prev => {
      const next = new Set(prev);
      next.add(ticketId);
      saveRespondedQueries(next);
      return next;
    });
  }, []);

  const attentionCount = useCallback((tickets: Ticket[]) => countNeedingAttention(tickets, respondedQueries), [respondedQueries]);

  return { respondedQueries, handleTicketUpdate, handleManagerResponded, attentionCount };
}
