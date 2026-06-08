import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { TicketFormPayload } from '../components/TicketForm';
import { getAllPendingReports, deletePendingReport } from './useIndexedDB';

export type TicketSubmitSync = {
  onSynced: () => void;
  refreshTickets: () => Promise<void>;
};

export function useTicketSubmit(
  socket: Socket,
  sync: TicketSubmitSync,
): {
  submitViaSocket: (payload: TicketFormPayload) => Promise<{ ticketId: string; ref: string }>;
  formLocked: boolean;
} {
  const [formLocked, setFormLocked] = useState(false);

  const submitViaSocket = useCallback((payload: TicketFormPayload): Promise<{ ticketId: string; ref: string }> => {
    return new Promise((resolve, reject) => {
      const delays = [2000, 4000, 8000];
      let attempt = 0;
      let timer: ReturnType<typeof setTimeout>;
      let settled = false;

      function cleanup() {
        clearTimeout(timer);
        socket.off('report_acknowledged', onAck);
        socket.off('report_error', onErr);
      }

      function tryEmit() {
        if (!socket.connected) {
          socket.once('connect', () => { socket.emit('client:identify', { role: 'manager' }); tryEmit(); });
          socket.connect();
          return;
        }
        socket.emit('ticket:submit', payload, (response: { ticketId: string; ref: string } | { error: string }) => {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          socket.off('report_acknowledged', onAck);
          socket.off('report_error', onErr);
          if ('error' in response) reject(new Error(response.error));
          else resolve(response);
        });
        timer = setTimeout(() => {
          attempt++;
          if (attempt < delays.length) tryEmit();
          else { cleanup(); if (!settled) { settled = true; reject(new Error('timeout')); } }
        }, delays[attempt]);
      }

      function onAck(data: { ticketId: string; ref: string }) {
        if (settled) return;
        settled = true; cleanup(); resolve(data);
      }

      function onErr(data: { error: string }) {
        if (settled) return;
        settled = true; cleanup(); reject(new Error(data.error));
      }

      socket.on('report_acknowledged', onAck);
      socket.on('report_error', onErr);
      tryEmit();
    });
  }, [socket]);

  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    async function handleOnline() {
      // Give the socket a moment to reconnect before trying to sync
      await new Promise(r => setTimeout(r, 3000));

      const queue = await getAllPendingReports();
      if (!queue.length) return;
      setFormLocked(true);
      let synced = 0;
      for (const report of queue) {
        try {
          await submitViaSocket(report.payload as TicketFormPayload);
          await deletePendingReport(report.key);
          synced++;
        } catch {
          // If one fails, stop trying — we're probably still offline
          break;
        }
      }
      if (synced > 0 && !(await getAllPendingReports()).length) {
        syncRef.current.onSynced();
        await syncRef.current.refreshTickets();
      }
      setFormLocked(false);
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [submitViaSocket]);

  return { submitViaSocket, formLocked };
}
