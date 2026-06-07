import { useState, useEffect, useCallback } from 'react';
import { Ticket } from '@shared/types';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import { apiFetch } from './auth/apiClient';
import { useSocket } from './hooks/useSocket';
import { useTicketSubmit } from './hooks/useTicketSubmit';
import { useRespondedQueries } from './hooks/useRespondedQueries';
import { savePendingReport } from './hooks/useIndexedDB';
import TicketForm, { TicketFormPayload } from './components/TicketForm';
import TicketList from './components/TicketList';
import StatusBanner from './components/StatusBanner';
import PwaInstallBanner from './components/PwaInstallBanner';
import FieldRemHeader from './components/FieldRemHeader';
import BottomTabBar, { Tab } from './components/BottomTabBar';

type BannerState = 'none' | 'sending' | 'submitted' | 'offline' | 'synced';

export default function App() {
  const { token, loading: authLoading, user } = useAuth();

  if (authLoading) {
    return (
      <div className="app-fieldrem min-h-screen mesh-bg flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-stone-300 border-t-[var(--action)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token) return <LoginPage />;

  return <AuthedApp token={token} />;
}

function AuthedApp({ token }: { token: string }) {
  const socket = useSocket(token);
  const [tab, setTab] = useState<Tab>('reports');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState>('none');
  const [submittedRef, setSubmittedRef] = useState('');
  const { respondedQueries, handleTicketUpdate, handleManagerResponded, attentionCount } = useRespondedQueries();

  const refreshTickets = useCallback(async () => {
    const res = await apiFetch('/tickets?viewer=manager');
    const data = await res.json().catch(() => ({}));
    setTickets(data.tickets || []);
  }, []);

  const loadArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const res = await apiFetch('/tickets?viewer=manager&status=archived');
      const data = await res.json().catch(() => ({}));
      setArchivedTickets(data.tickets || []);
    } finally { setLoadingArchive(false); }
  }, []);

  const onSynced = useCallback(() => setBanner('synced'), []);
  const { submitViaSocket, formLocked } = useTicketSubmit(socket, { onSynced, refreshTickets });

  useEffect(() => {
    apiFetch('/tickets?viewer=manager')
      .then(r => r.json())
      .then(d => setTickets(d.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'archive') loadArchive();
  }, [tab, loadArchive]);

  useEffect(() => {
    const onUpdated = ({ ticket }: { ticket: Ticket }) => handleTicketUpdate(ticket, setTickets);
    const onArchived = ({ ticketId }: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (tab === 'archive') loadArchive();
    };
    socket.on('ticket:updated', onUpdated);
    socket.on('ticket:archived', onArchived);
    return () => { socket.off('ticket:updated', onUpdated); socket.off('ticket:archived', onArchived); };
  }, [socket, tab, loadArchive]);

  useEffect(() => {
    if (banner === 'offline' || banner === 'none') return;
    const t = setTimeout(() => setBanner('none'), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  async function handleSubmit(payload: TicketFormPayload) {
    setSubmitting(true); setBanner('sending');
    try {
      const ack = await submitViaSocket(payload);
      await refreshTickets();
      setSubmittedRef(ack.ref); setBanner('submitted');
      (window as Window & { __resetTicketForm?: () => void }).__resetTicketForm?.();
      setTab('reports');
    } catch (err) {
      console.error('[SUBMIT] failed:', err instanceof Error ? err.message : err);
      await savePendingReport({
        key: Date.now(),
        payload: { ...payload, quantity: payload.items.reduce((s, i) => s + i.quantity, 0), reason: payload.items[0]?.reason ?? '' },
      });
      setBanner('offline');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="app-fieldrem min-h-screen mesh-bg flex flex-col">
      <StatusBanner banner={banner} submittedRef={submittedRef} />
      <PwaInstallBanner />
      <div className="max-w-lg mx-auto flex flex-col flex-1 w-full">
        <FieldRemHeader />
        <main className="flex-1 min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {tab === 'new' && (
            <TicketForm onSubmit={handleSubmit} submitting={submitting} disabled={formLocked} />
          )}
          {tab === 'reports' && (
            <TicketList tickets={tickets} loading={loading} respondedQueries={respondedQueries}
              onTicketUpdate={t => handleTicketUpdate(t, setTickets)} onManagerResponded={handleManagerResponded} />
          )}
          {tab === 'archive' && (
            <TicketList tickets={archivedTickets} loading={loadingArchive} respondedQueries={respondedQueries}
              onTicketUpdate={t => handleTicketUpdate(t, setArchivedTickets)} onManagerResponded={handleManagerResponded}
              emptyIcon="archive" emptyTitle="No archived reports"
              emptySubtitle="Reports you mark as fitted will appear here." />
          )}
        </main>
        <BottomTabBar active={tab} onChange={setTab} attentionCount={attentionCount(tickets)} />
      </div>
    </div>
  );
}
