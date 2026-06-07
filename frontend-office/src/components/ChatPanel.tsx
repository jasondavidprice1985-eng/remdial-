import React, { useState } from 'react';
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
  const [isQuery, setIsQuery] = useState(false);
  const [sending, setSending] = useState(false);
  const { recording, startRecording, stopRecording, getAudioPayload } = useAudioRecorder();

  async function sendText() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'office', text: text.trim(), audio: null, audio_mime: null, is_query: isQuery }),
      });
      if (res.ok) setText('');
      setIsQuery(false);
    } finally { setSending(false); }
  }

  async function handlePhotoSelect(file: File) {
    if (sending) return;
    setSending(true);
    try {
      const image = await resizeImageToBase64(file);
      const res = await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'office', text: null, image, is_query: isQuery }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed to send photo (HTTP ${res.status}): ${body.error || 'unknown error'}`);
        return;
      }
      setIsQuery(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      alert(`Failed to send photo: ${msg}`);
    } finally { setSending(false); }
  }

  async function handleMicClick() {
    if (recording) {
      const payloadPromise = getAudioPayload();
      stopRecording();
      const payload = await payloadPromise;
      if (!payload) {
        alert('No audio was captured. Try recording for a couple of seconds before stopping.');
        return;
      }
      setSending(true);
      try {
        const res = await apiFetch(`/tickets/${ticketId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'office', text: null, audio: payload.audio, audio_mime: payload.audio_mime, is_query: isQuery,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          alert(`Failed to send voice note (HTTP ${res.status}): ${body.error || 'unknown error'}`);
          return;
        }
        setIsQuery(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        alert(`Failed to send voice note: ${msg}`);
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
      <ChatInputBar text={text} isQuery={isQuery} sending={sending} recording={recording}
        onTextChange={setText} onQueryChange={setIsQuery} onSend={sendText} onMicClick={handleMicClick}
        onPhotoSelect={handlePhotoSelect} />
    </div>
  );
}
