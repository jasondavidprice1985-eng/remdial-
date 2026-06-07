import { Message } from '@shared/types';
import { formatMessageTime, ownMessageStatus, senderLabel } from '@shared/messageFormat';
import AudioPlayer from './AudioPlayer';

const ORIGIN = import.meta.env.VITE_SOCKET_URL as string;

interface Props {
  loading: boolean;
  loadError: boolean;
  messages: Message[];
  bottomRef: React.RefObject<HTMLDivElement>;
  onRetry: () => void;
}

export default function ChatMessageList({ loading, loadError, messages, bottomRef, onRetry }: Props) {
  if (loading) return <p className="text-sm text-[var(--muted)] text-center py-12">Loading messages…</p>;
  if (loadError) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm text-[var(--query)]">Could not load messages</p>
        <button type="button" onClick={onRetry} className="text-xs font-semibold text-[var(--pending)] underline">Try again</button>
      </div>
    );
  }
  if (messages.length === 0) {
    return <p className="text-sm text-[var(--muted)] text-center py-12">No messages yet — send one below</p>;
  }

  return (
    <>
      {messages.map(msg => {
        const mine = msg.sender === 'office';
        const status = ownMessageStatus(msg, 'office');
        return (
          <div key={msg.id} className={`flex flex-col gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 text-[11px] ${mine ? 'flex-row-reverse' : ''}`}>
              <span className="font-bold text-[var(--text)]">{senderLabel(msg.sender, 'office')}</span>
              <span className="text-[var(--muted)]">{formatMessageTime(msg.created_at)}</span>
              {status && (
                <span className={`font-semibold ${status === 'Read' ? 'text-[var(--ordered)]' : 'text-[var(--muted)]'}`}>· {status}</span>
              )}
            </div>
            <div className={`max-w-[92%] px-3.5 py-3 text-sm leading-relaxed ${mine ? 'chat-out' : 'chat-in'}`}>
              {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
              {msg.image_path && (
                <a href={`${ORIGIN}${msg.image_path}`} target="_blank" rel="noopener noreferrer">
                  <img src={`${ORIGIN}${msg.image_path}`} alt="attachment"
                    className="mt-1 max-w-full max-h-60 rounded-lg" />
                </a>
              )}
              {msg.audio_path && <AudioPlayer src={`${ORIGIN}${msg.audio_path}`} />}
              {msg.is_query && <p className="text-[11px] text-[var(--query)] mt-1.5 font-semibold">⚠ Needs Clarification</p>}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </>
  );
}
