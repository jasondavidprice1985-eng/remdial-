import { useState, useEffect, useMemo } from 'react';
import { Ticket } from '@shared/types';
import { Queue } from '../components/QueueNav';
import { sortQueueTickets } from '../utils/sortQueueTickets';
import { countByStatus, unreadInQueue } from '../utils/queueStats';

function ticketQueue(t: Ticket): Queue {
  if (t.status === 'pending' && !t.accepted_at) return 'inbox';
  if (t.status === 'pending') return 'pending';
  return t.status as Queue;
}

function ticketsForQueue(tickets: Ticket[], queue: Queue): Ticket[] {
  if (queue === 'inbox')   return tickets.filter(t => t.status === 'pending' && !t.accepted_at);
  if (queue === 'pending') return tickets.filter(t => t.status === 'pending' && !!t.accepted_at);
  return tickets.filter(t => t.status === queue);
}

export function useQueueBoard(tickets: Ticket[], onUpdate: (t: Ticket) => void, isDesktop: boolean) {
  const [queue, setQueue] = useState<Queue>('inbox');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [ready, setReady] = useState(false);

  const counts = useMemo(() => countByStatus(tickets), [tickets]);
  const unread = useMemo(() => ({
    inbox:   unreadInQueue(tickets, 'inbox'),
    pending: unreadInQueue(tickets, 'pending'),
    query:   unreadInQueue(tickets, 'query'),
    ordered: unreadInQueue(tickets, 'ordered'),
  }), [tickets]);

  const queueTickets = useMemo(
    () => sortQueueTickets(ticketsForQueue(tickets, queue)),
    [tickets, queue],
  );

  useEffect(() => {
    if (ready || !tickets.length) return;
    if (counts.inbox > 0) setQueue('inbox');
    else if (counts.query > 0) setQueue('query');
    setReady(true);
  }, [tickets.length, counts.inbox, counts.query, ready]);

  useEffect(() => {
    if (!selected) return;
    const fresh = tickets.find(t => t.id === selected.id);
    if (!fresh) { setSelected(null); return; }
    setSelected(prev => {
      if (!prev || prev.id !== fresh.id) return fresh;
      if (
        prev.unread_count !== fresh.unread_count ||
        prev.status !== fresh.status ||
        prev.accepted_at !== fresh.accepted_at ||
        prev.updated_at !== fresh.updated_at
      ) return fresh;
      return prev;
    });
    const tq = ticketQueue(fresh);
    if (tq !== queue) setQueue(tq);
  }, [tickets, selected?.id, queue]);

  function pickQueue(next: Queue) {
    setQueue(next);
    const list = sortQueueTickets(ticketsForQueue(tickets, next));
    setSelected(isDesktop ? list[0] ?? null : null);
  }

  function handleUpdate(t: Ticket) {
    onUpdate(t);
    setSelected(t);
    const tq = ticketQueue(t);
    if (tq !== queue) setQueue(tq);
  }

  // Used after a terminal action (Mark Ordered) — go back to the inbox-like
  // landing state so the user can pick the next ticket instead of being parked
  // on the one they just finished with. Data update has already happened via handleUpdate.
  function goHome() {
    setSelected(null);
    setQueue('inbox');
  }

  useEffect(() => {
    if (!isDesktop || selected) return;
    setSelected(queueTickets[0] ?? null);
  }, [isDesktop, queue, queueTickets, selected]);

  return {
    queue, counts, unread, queueTickets, selected, setSelected,
    pickQueue, handleUpdate, goHome, showMobileWork: !!(selected && !isDesktop),
  };
}
