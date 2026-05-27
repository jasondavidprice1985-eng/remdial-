import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageSender, Ticket } from '@shared/types';
import { getSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import ChatMessageList from './ChatMessageList';
import ChatInputBar from './ChatInputBar';

interface Props {
  ticketId: string;
  role: MessageSender;
  onTicketViewed?: (ticket: Ticket) => void;
  onManagerResponded?: () => void;
}

const API = import.meta.env.VITE_API_URL as string;

export default function ChatPanel({ ticketId, role, onTicketViewed, onManagerResponded }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onViewedRef = useRef(onTicketViewed);
  onViewedRef.current = onTicketViewed;
  const { recording, startRecording, stopRecording, getAudioPayload } = useAudioRecorder();

  const loadMessages = useCallback(() => {
    fetch(`${API}/tickets/${ticketId}?viewer=${role}`)
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages || []);
        if (d.ticket) onViewedRef.current?.(d.ticket);
      });
  }, [ticketId, role]);

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
      const res = await fetch(`${API}/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: role, text: text.trim(), audio: null, audio_mime: null, is_query: false }),
      });
      if (res.ok) { setText(''); if (role === 'manager') onManagerResponded?.(); }
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
        const res = await fetch(`${API}/tickets/${ticketId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: role, text: null, audio: payload.audio, audio_mime: payload.audio_mime, is_query: false }),
        });
        if (res.ok && role === 'manager') onManagerResponded?.();
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
      <ChatInputBar text={text} sending={sending} recording={recording}
        onTextChange={setText} onSend={sendTextMessage} onMicClick={handleMicClick} />
    </div>
  );
}
