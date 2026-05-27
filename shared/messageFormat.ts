import type { Message, MessageSender } from './types';

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
}

export function senderLabel(sender: MessageSender, viewer: MessageSender): string {
  if (sender === viewer) return 'You';
  return viewer === 'manager' ? 'Admin' : 'Manager';
}

export function ownMessageStatus(msg: Message, viewer: MessageSender): string | null {
  if (msg.sender !== viewer) return null;
  return msg.read_at ? 'Read' : 'Sent';
}
