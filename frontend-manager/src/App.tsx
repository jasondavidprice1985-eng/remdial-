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
import SwipeableViews from './components/SwipeableViews';

type BannerState = 'none' | 'sending' | 'submitted' | 'offline' | 'synced' | 'error';

export default function App() {
  const { token, loading: authLoading, user, mustChangePassword } = useAuth();

  if (authLoading) {
    return (
      <div className="app-fieldrem min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-stone-300 border-t-[var(--action)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token || mustChangePassword) return <LoginPage />;

  return <AuthedApp token={token} />;
}

function AuthedApp({ token }: { token: string }) {
  const socket = useSocket(token);
  const [tab, setTab] = useState<Tab>('reports');
  const TABS: Tab[] = ['reports', 'new', 'archive'];
  const tabIndex = TABS.indexOf(tab);
  function handleSwipe(index: number) { setTab(TABS[index]); }
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [archivePage, setArchivePage] = useState(0);
  const ARCHIVE_PAGE_SIZE = 10;
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
      showError('Could not refresh tickets.');
    }
  }, [showError]);

  const loadArchive = useCallback(async (page: number) => {
    setLoadingArchive(true);
    try {
      const offset = page * ARCHIVE_PAGE_SIZE;
      const res = await apiFetch(`/tickets?viewer=manager&status=archived&limit=${ARCHIVE_PAGE_SIZE}&offset=${offset}`);
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
        showError('Could not load tickets.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'archive') loadArchive(archivePage);
  }, [tab, archivePage, loadArchive]);

  useEffect(() => {
    const onUpdated = ({ ticket }: { ticket: Ticket }) => {
      console.log('[SOCKET] ticket:updated', ticket.ref, ticket.status, 'unread=', ticket.unread_count);
      handleTicketUpdate(ticket, setTickets);
    };
    const onArchived = ({ ticketId }: { ticketId: string }) => {
      console.log('[SOCKET] ticket:archived', ticketId);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (tab === 'archive') loadArchive(archivePage);
    };
    const onConnect = () => console.log('[SOCKET] connected id=', socket.id);
    const onDisconnect = (r: string) => console.log('[SOCKET] disconnected reason=', r);
    const onError = (e: Error) => console.error('[SOCKET] connect_error', e.message);
    socket.on('ticket:updated', onUpdated);
    socket.on('ticket:archived', onArchived);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    return () => {
      socket.off('ticket:updated', onUpdated);
      socket.off('ticket:archived', onArchived);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [socket, tab, archivePage, loadArchive]);

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
        <AppHeader tab={tab} archivePage={archivePage} archivePageSize={ARCHIVE_PAGE_SIZE} archivePageCount={archivedTickets.length} />
        <main className="flex-1 min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          <SwipeableViews activeIndex={tabIndex} onChangeIndex={handleSwipe} disabled={submitting}>
            <TicketList tickets={tickets} loading={loading} respondedQueries={respondedQueries} pendingCount={pendingCount}
              onTicketUpdate={t => handleTicketUpdate(t, setTickets)} onManagerResponded={handleManagerResponded} />
            <TicketForm onSubmit={handleSubmit} submitting={submitting} disabled={formLocked} isActive={tab === 'new'} />
            <>
              <TicketList tickets={archivedTickets} loading={loadingArchive} respondedQueries={respondedQueries}
                onTicketUpdate={t => handleTicketUpdate(t, setArchivedTickets)} onManagerResponded={handleManagerResponded}
                heading="" emptyIcon="archive" emptyTitle="No archived tickets"
                emptySubtitle="Completed tickets will appear here." />
              {!loadingArchive && (archivePage > 0 || archivedTickets.length >= ARCHIVE_PAGE_SIZE) && (
                <ArchivePager
                  page={archivePage}
                  hasPrev={archivePage > 0}
                  hasNext={archivedTickets.length >= ARCHIVE_PAGE_SIZE}
                  onPrev={() => setArchivePage(p => Math.max(0, p - 1))}
                  onNext={() => setArchivePage(p => p + 1)}
                />
              )}
            </>
          </SwipeableViews>
        </main>
        <BottomTabBar active={tab} onChange={setTab} attentionCount={attentionCount(tickets)} />
      </div>
    </div>
  );
}

function ArchivePager({ page, hasPrev, hasNext, onPrev, onNext }: {
  page: number; hasPrev: boolean; hasNext: boolean; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-[var(--border)]">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="h-10 px-4 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[var(--text)] inline-flex items-center gap-2 hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </button>
      <span className="text-[12.5px] font-medium text-[var(--subtle)] tabular-nums">Page {page + 1}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="h-10 px-4 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[var(--text)] inline-flex items-center gap-2 hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        Next
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
