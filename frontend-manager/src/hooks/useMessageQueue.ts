import { useCallback, useEffect } from 'react';
import { apiFetch } from '../auth/apiClient';
import { savePendingMessage, getAllPendingMessages, deletePendingMessage, QueuedMessage } from './useIndexedDB';

export function useMessageQueue(queueDirtyFlag?: { current: number }) {
  const flush = useCallback(async () => {
    const messages = await getAllPendingMessages();
    if (messages.length === 0) return;

    for (const msg of messages) {
      try {
        const res = await apiFetch(`/tickets/${msg.ticketId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.body),
        });
        if (res.ok) {
          await deletePendingMessage(msg.id!);
        } else {
          break; // stop on server error to preserve order
        }
      } catch {
        break; // still offline
      }
    }
  }, []);

  const queue = useCallback(async (ticketId: string, body: Record<string, unknown>) => {
    await savePendingMessage({ ticketId, body, createdAt: Date.now() });
  }, []);

  // Flush when coming back online
  useEffect(() => {
    function onOnline() {
      setTimeout(() => flush(), 2000);
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return { flush, queue };
}
