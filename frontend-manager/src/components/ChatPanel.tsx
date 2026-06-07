import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageSender, Ticket } from '@shared/types';
import { getSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { apiFetch } from '../auth/apiClient';
import { resizeImageToBase64 } from '../utils/imageResize';
import ChatMessageList from './ChatMessageList';
import ChatInputBar from './ChatInputBar';

interface Props {
  ticketId: string;
  role: MessageSender;
  onTicketViewed?: (ticket: Ticket) => void;
  onManagerResponded?: () => void;
  draft?: string;
  draftToken?: number;
}

export default function ChatPanel({ ticketId, role, onTicketViewed, onManagerResponded, draft, draftToken }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  // When a new draft is pushed in from outside (e.g. per-item "Query this item"),
  // replace the input text. The token forces this to fire even if draft is the same.
  useEffect(() => {
    if (draft !== undefined) setText(draft);
  }, [draftToken]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onViewedRef = useRef(onTicketViewed);
  onViewedRef.current = onTicketViewed;
  const { recording, startRecording, stopRecording, getAudioPayload } = useAudioRecorder();

  // Auto-dismiss error banner after 4s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const flash = useCallback((msg: string) => setError(msg), []);

  const loadMessages = useCallback(() => {
    apiFetch(`/tickets/${ticketId}?viewer=${role}`)
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages || []);
        if (d.ticket) onViewedRef.current?.(d.ticket);
      })
      .catch(err => {
        console.error('[chat] load messages failed', err);
        flash('Could not load messages.');
      });
  }, [ticketId, role, flash]);

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

  async function sendTextMessage() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: role, text: text.trim(), audio: null, audio_mime: null, is_query: false }),
      });
      if (res.ok) { setText(''); if (role === 'manager') onManagerResponded?.(); }
    } finally { setSending(false); }
  }

  async function handlePhotoSelect(file: File) {
    if (sending) return;
    setSending(true);
    try {
      const image = await resizeImageToBase64(file);
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: role, text: null, image, is_query: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        flash(`Couldn't send photo (${res.status}). ${body.error || ''}`.trim());
        return;
      }
      if (role === 'manager') onManagerResponded?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      flash(`Couldn't send photo. ${msg}`);
    } finally { setSending(false); }
  }

  async function handleMicClick() {
    if (recording) {
      const payloadPromise = getAudioPayload();
      stopRecording();
      const payload = await payloadPromise;
      if (!payload) {
        flash('No audio captured. Hold the mic for a couple of seconds before stopping.');
        return;
      }
      setSending(true);
      try {
        const res = await apiFetch(`/tickets/${ticketId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: role, text: null, audio: payload.audio, audio_mime: payload.audio_mime, is_query: false }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          flash(`Couldn't send voice note (${res.status}). ${body.error || ''}`.trim());
          return;
        }
        if (role === 'manager') onManagerResponded?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        flash(`Couldn't send voice note. ${msg}`);
      } finally { setSending(false); }
    } else {
      await startRecording();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-[var(--border)] shrink-0">
        <p className="text-xs font-semibold text-[var(--text)]">Messages</p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        <ChatMessageList messages={messages} role={role} bottomRef={bottomRef} />
      </div>
      {error && (
        <div className="px-3 py-2 text-xs font-medium text-white bg-[var(--danger)] flex items-center justify-between gap-2 shrink-0">
          <span className="truncate">⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-white/80 text-base leading-none px-1" aria-label="Dismiss">×</button>
        </div>
      )}
      <ChatInputBar text={text} sending={sending} recording={recording}
        onTextChange={setText} onSend={sendTextMessage} onMicClick={handleMicClick}
        onPhotoSelect={handlePhotoSelect} />
    </div>
  );
}
