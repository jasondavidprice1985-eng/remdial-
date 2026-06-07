import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Ticket } from '@shared/types';
import { getSocket } from './useSocket';
import { apiFetch } from '../auth/apiClient';

const VIEWER = 'office' as const;

export function useTicketChatMessages(ticketId: string, onTicketViewed?: (ticket: Ticket) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onViewedRef = useRef(onTicketViewed);
  onViewedRef.current = onTicketViewed;

  const loadMessages = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiFetch(`/tickets/${ticketId}?viewer=${VIEWER}`)
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then(d => {
        setMessages(d.messages || []);
        if (d.ticket) onViewedRef.current?.(d.ticket);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    socket.emit('ticket:join', { ticketId });
    const onMsg = ({ message }: { message: Message }) =>
      setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
    const onRead = ({ ticketId: id }: { ticketId: string }) => { if (id === ticketId) loadMessages(); };
    socket.on('message:new', onMsg);
    socket.on('messages:read', onRead);
    return () => {
      socket.emit('ticket:leave', { ticketId });
      socket.off('message:new', onMsg);
      socket.off('messages:read', onRead);
    };
  }, [ticketId, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return { messages, loading, loadError, loadMessages, bottomRef };
}
