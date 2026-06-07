import React, { useCallback, useEffect, useState } from 'react';
import { Ticket } from '@shared/types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTicketChatMessages } from '../hooks/useTicketChatMessages';
import { apiFetch } from '../auth/apiClient';
import { resizeImageToBase64 } from '../utils/imageResize';
import ChatMessageList from './ChatMessageList';
import ChatInputBar from './ChatInputBar';

interface Props {
  ticketId: string;
  onTicketViewed?: (ticket: Ticket) => void;
}

export default function ChatPanel({ ticketId, onTicketViewed }: Props) {
  const { messages, loading, loadError, loadMessages, bottomRef } = useTicketChatMessages(ticketId, onTicketViewed);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, startRecording, stopRecording, getAudioPayload } = useAudioRecorder();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const flash = useCallback((m: string) => setError(m), []);

  async function sendText() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'office', text: text.trim(), audio: null, audio_mime: null, is_query: false }),
      });
      if (res.ok) setText('');
    } finally { setSending(false); }
  }

  async function handlePhotoSelect(file: File) {
    if (sending) return;
    setSending(true);
    try {
      const image = await resizeImageToBase64(file);
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'office', text: null, image, is_query: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        flash(`Couldn't send photo (${res.status}). ${body.error || ''}`.trim());
        return;
      }
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
          body: JSON.stringify({
            sender: 'office', text: null, audio: payload.audio, audio_mime: payload.audio_mime, is_query: false,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          flash(`Couldn't send voice note (${res.status}). ${body.error || ''}`.trim());
          return;
        }
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
      <div className="flex-1 min-h-[160px] overflow-y-auto p-4 space-y-4 bg-[var(--surface)]">
        <ChatMessageList loading={loading} loadError={loadError} messages={messages} bottomRef={bottomRef} onRetry={loadMessages} />
      </div>
      {error && (
        <div className="px-3 py-2 text-xs font-medium text-white bg-[var(--query)] flex items-center justify-between gap-2 shrink-0">
          <span className="truncate">⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-white/80 text-base leading-none px-1" aria-label="Dismiss">×</button>
        </div>
      )}
      <ChatInputBar text={text} sending={sending} recording={recording}
        onTextChange={setText} onSend={sendText} onMicClick={handleMicClick}
        onPhotoSelect={handlePhotoSelect} />
    </div>
  );
}
