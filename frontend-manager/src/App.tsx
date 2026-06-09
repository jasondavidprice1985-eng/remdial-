import { useState, useEffect, useCallback } from 'react';
import { Ticket } from '@shared/types';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import { apiFetch } from './auth/apiClient';
import { useSocket } from './hooks/useSocket';
import { useTicketSubmit } from './hooks/useTicketSubmit';
import { useRespondedQueries } from './hooks/useRespondedQueries';
import { savePendingReport, getAllPendingReports } from './hooks/useIndexedDB';
import TicketForm, { TicketFormPayload } from './components/TicketForm';
import TicketList from './components/TicketList';
import StatusBanner from './components/StatusBanner';
import PwaInstallBanner from './components/PwaInstallBanner';
import AppHeader from './components/AppHeader';
import BottomTabBar, { Tab } from './components/BottomTabBar';

type BannerState = 'none' | 'sending' | 'submitted' | 'offline' | 'synced' | 'error';

export default function App() {
  const { token, loading: authLoading, user } = useAuth();

  if (authLoading) {
    return (
      <div className="app-fieldrem min-h-screen bg-[var(--surface)] flex items-center justify-center">
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
  const [errorText, setErrorText] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const { respondedQueries, handleTicketUpdate, handleManagerResponded, attentionCount } = useRespondedQueries();

  // Check for unsent reports on load and when online status changes
  useEffect(() => {
    async function checkPending() {
      const queue = await getAllPendingReports();
      setPendingCount(queue.length);
    }
    checkPending();
    window.addEventListener('online', () => setTimeout(checkPending, 5000));
    return () => window.removeEventListener('online', checkPending);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorText(message);
    setBanner('error');
  }, []);

  const refreshTickets = useCallback(async () => {
    try {
      const res = await apiFetch('/tickets?viewer=manager');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('[tickets] refresh failed', err);
      showError('Could not refresh reports.');
    }
  }, [showError]);

  const loadArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const res = await apiFetch('/tickets?viewer=manager&status=archived');
      const data = await res.json();
      setArchivedTickets(data.tickets || []);
    } catch (err) {
      console.error('[archive] load failed', err);
      showError('Could not load archive.');
    } finally { setLoadingArchive(false); }
  }, [showError]);

  const onSynced = useCallback(() => { setBanner('synced'); setPendingCount(0); }, []);
  const { submitViaSocket, formLocked } = useTicketSubmit(socket, { onSynced, refreshTickets });

  useEffect(() => {
    apiFetch('/tickets?viewer=manager')
      .then(r => r.json())
      .then(d => setTickets(d.tickets || []))
      .catch(err => {
        console.error('[tickets] initial load failed', err);
        showError('Could not load reports.');
      })
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
      // Hard timeout — if nothing happens in 15 seconds, save offline
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('hard_timeout')), 15000)
      );
      const ack = await Promise.race([submitViaSocket(payload), timeout]);
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
      setPendingCount(c => c + 1);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="app-fieldrem min-h-screen bg-[var(--surface)] flex flex-col">
      <StatusBanner banner={banner} submittedRef={submittedRef} errorText={errorText} />
      <PwaInstallBanner />
      <div className="max-w-lg mx-auto flex flex-col flex-1 w-full">
        {tab === 'reports' && <AppHeader />}
        {tab === 'archive' && (
          <div className="px-5 pt-5 pb-5 border-b border-[var(--border)] flex items-center gap-3.5"
            style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
            <div className="w-11 h-11 rounded-lg bg-[var(--text)] text-white grid place-items-center text-[18px] font-bold shrink-0">
              R
            </div>
            <div className="flex-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)] m-0 leading-[1.15]">Archive</h1>
              <p className="text-[13px] text-[var(--ordered)] m-0 mt-1 inline-flex items-center gap-1.5">
                <span className="w-[6px] h-[6px] rounded-full bg-[var(--ordered)]" />
                {archivedTickets.length} job{archivedTickets.length === 1 ? '' : 's'} complete
              </p>
            </div>
          </div>
        )}
        <main className="flex-1 min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {tab === 'new' && (
            <TicketForm onSubmit={handleSubmit} submitting={submitting} disabled={formLocked} />
          )}
          {tab === 'reports' && (
            <TicketList tickets={tickets} loading={loading} respondedQueries={respondedQueries} pendingCount={pendingCount}
              onTicketUpdate={t => handleTicketUpdate(t, setTickets)} onManagerResponded={handleManagerResponded} />
          )}
          {tab === 'archive' && (
            <TicketList tickets={archivedTickets} loading={loadingArchive} respondedQueries={respondedQueries}
              onTicketUpdate={t => handleTicketUpdate(t, setArchivedTickets)} onManagerResponded={handleManagerResponded}
              heading="" emptyIcon="archive" emptyTitle="No archived reports"
              emptySubtitle="Completed reports will appear here." />
          )}
        </main>
        <BottomTabBar active={tab} onChange={setTab} attentionCount={attentionCount(tickets)} />
      </div>
    </div>
  );
}
