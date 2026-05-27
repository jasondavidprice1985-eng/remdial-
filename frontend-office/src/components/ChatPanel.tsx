import React, { useState } from 'react';
import { Ticket } from '@shared/types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTicketChatMessages } from '../hooks/useTicketChatMessages';
import ChatMessageList from './ChatMessageList';
import ChatInputBar from './ChatInputBar';

interface Props {
  ticketId: string;
  onTicketViewed?: (ticket: Ticket) => void;
}

const API = import.meta.env.VITE_API_URL as string;

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
      const res = await fetch(`${API}/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'office', text: text.trim(), audio: null, audio_mime: null, is_query: isQuery }),
      });
      if (res.ok) setText('');
      setIsQuery(false);
    } finally { setSending(false); }
  }

  async function handleMicClick() {
    if (recording) {
      const payloadPromise = getAudioPayload();
      stopRecording();
      const payload = await payloadPromise;
      if (!payload) return;
      setSending(true);
      try {
        await fetch(`${API}/tickets/${ticketId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'office', text: null, audio: payload.audio, audio_mime: payload.audio_mime, is_query: isQuery,
          }),
        });
        setIsQuery(false);
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
        onTextChange={setText} onQueryChange={setIsQuery} onSend={sendText} onMicClick={handleMicClick} />
    </div>
  );
}
