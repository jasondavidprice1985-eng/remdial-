import { useState, useEffect, useRef } from 'react';
import { Ticket } from '@shared/types';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import { apiFetch } from './auth/apiClient';
import { useSocket } from './hooks/useSocket';
import { initAudioContext, playChime } from './utils/chime';
import QueueBoard from './components/QueueBoard';
import ArchiveView from './components/ArchiveView';
import OfficeHeader from './components/OfficeHeader';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const { token, loading: authLoading, user, mustChangePassword } = useAuth();

  if (authLoading) {
    return (
      <div className="app-office h-screen flex items-center justify-center office-bg">
        <span className="w-8 h-8 border-2 border-stone-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token || mustChangePassword) return <LoginPage />;

  return <AuthedApp token={token} />;
}

function AuthedApp({ token }: { token: string }) {
  const { user } = useAuth();
  const socket = useSocket(token);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archiveMode, setArchiveMode] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [filterDev, setFilterDev] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const audioUnlocked = useRef(false);

  function unlockAudio() {
    if (!audioUnlocked.current) { initAudioContext(); audioUnlocked.current = true; setAudioReady(true); }
  }

  useEffect(() => {
    apiFetch('/tickets?viewer=office').then(r => r.json()).then(d => setTickets(d.tickets || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!archiveMode) return;
    apiFetch('/tickets?status=archived&viewer=office').then(r => r.json()).then(d => setArchivedTickets(d.tickets || [])).catch(() => {});
  }, [archiveMode]);

  useEffect(() => {
    const onCreated = ({ ticket }: { ticket: Ticket }) => { setTickets(prev => [ticket, ...prev]); playChime(); };
    const onUpdated = ({ ticket }: { ticket: Ticket }) => setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    const onArchived = ({ ticketId }: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (archiveMode) apiFetch('/tickets?status=archived&viewer=office').then(r => r.json()).then(d => setArchivedTickets(d.tickets || [])).catch(() => {});
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
    <div className="app-office h-screen flex flex-col bg-[var(--surface)]" onClick={unlockAudio}>
      {!audioReady && (
        <div className="text-center py-1.5 text-xs text-[var(--muted)] border-b border-[var(--border)]">
          Click anywhere to enable notifications
        </div>
      )}
      <OfficeHeader archiveMode={archiveMode} unreadTotal={unreadTotal}
        onToggleArchive={() => { setArchiveMode(m => !m); setAdminMode(false); }}
        isAdmin={user?.role === 'admin'} adminMode={adminMode}
        onToggleAdmin={() => { setAdminMode(m => !m); setArchiveMode(false); }} />
      <div className="flex-1 overflow-hidden px-6 pt-5 pb-5 min-h-0">
        {adminMode ? (
          <AdminDashboard />
        ) : archiveMode ? (
          <ArchiveView tickets={archivedTickets} filterDev={filterDev} filterSite={filterSite}
            onFilterDev={setFilterDev} onFilterSite={setFilterSite} />
        ) : (
          <QueueBoard tickets={tickets} onUpdate={t => setTickets(prev => prev.map(x => x.id === t.id ? t : x))} />
        )}
      </div>
    </div>
  );
}
