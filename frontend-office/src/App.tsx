import React, { useState, useEffect, useRef } from 'react';
import { Ticket } from '@shared/types';
import { useSocket } from './hooks/useSocket';
import { initAudioContext, playChime } from './utils/chime';
import QueueBoard from './components/QueueBoard';
import ArchiveView from './components/ArchiveView';
import OfficeHeader from './components/OfficeHeader';

const API = import.meta.env.VITE_API_URL as string;

export default function App() {
  const socket = useSocket();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archiveMode, setArchiveMode] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [filterDev, setFilterDev] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const audioUnlocked = useRef(false);

  function unlockAudio() {
    if (!audioUnlocked.current) { initAudioContext(); audioUnlocked.current = true; setAudioReady(true); }
  }

  useEffect(() => {
    fetch(`${API}/tickets?viewer=office`).then(r => r.json()).then(d => setTickets(d.tickets || []));
  }, []);

  useEffect(() => {
    if (!archiveMode) return;
    fetch(`${API}/tickets?status=archived&viewer=office`).then(r => r.json()).then(d => setArchivedTickets(d.tickets || []));
  }, [archiveMode]);

  useEffect(() => {
    const onCreated = ({ ticket }: { ticket: Ticket }) => { setTickets(prev => [ticket, ...prev]); playChime(); };
    const onUpdated = ({ ticket }: { ticket: Ticket }) => setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    const onArchived = ({ ticketId }: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (archiveMode) fetch(`${API}/tickets?status=archived&viewer=office`).then(r => r.json()).then(d => setArchivedTickets(d.tickets || []));
    };
    socket.on('ticket:created', onCreated);
    socket.on('ticket:updated', onUpdated);
    socket.on('ticket:archived', onArchived);
    return () => {
      socket.off('ticket:created', onCreated);
      socket.off('ticket:updated', onUpdated);
      socket.off('ticket:archived', onArchived);
    };
  }, [socket, archiveMode]);

  const unreadTotal = tickets.reduce((sum, t) => sum + (t.unread_count ?? 0), 0);

  return (
    <div className="app-office h-screen flex flex-col office-bg" onClick={unlockAudio}>
      {!audioReady && (
        <div className="text-center py-1.5 text-xs text-[var(--muted)] border-b border-[var(--border)]">
          Click anywhere to enable notifications
        </div>
      )}
      <OfficeHeader archiveMode={archiveMode} unreadTotal={unreadTotal}
        onToggleArchive={() => setArchiveMode(m => !m)} />
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-3 min-h-0">
        {archiveMode ? (
          <ArchiveView tickets={archivedTickets} filterDev={filterDev} filterSite={filterSite}
            onFilterDev={setFilterDev} onFilterSite={setFilterSite} />
        ) : (
          <QueueBoard tickets={tickets} onUpdate={t => setTickets(prev => prev.map(x => x.id === t.id ? t : x))} />
        )}
      </div>
    </div>
  );
}
