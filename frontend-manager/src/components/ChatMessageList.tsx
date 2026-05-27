import { Message, MessageSender } from '@shared/types';
import { formatMessageTime, ownMessageStatus, senderLabel } from '@shared/messageFormat';

const ORIGIN = import.meta.env.VITE_SOCKET_URL as string;

interface Props {
  messages: Message[];
  role: MessageSender;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export default function ChatMessageList({ messages, role, bottomRef }: Props) {
  if (messages.length === 0) {
    return <p className="text-xs text-[var(--muted)] text-center py-8">No messages yet — send one below</p>;
  }

  return (
    <>
      {messages.map(msg => {
        const mine = msg.sender === role;
        const status = ownMessageStatus(msg, role);
        return (
          <div key={msg.id} className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 text-[10px] ${mine ? 'flex-row-reverse' : ''}`}>
              <span className="font-semibold text-[var(--text)]">{senderLabel(msg.sender, role)}</span>
              <span className="text-[var(--muted)]">{formatMessageTime(msg.created_at)}</span>
              {status && (
                <span className={`font-medium ${status === 'Read' ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
                  · {status}
                </span>
              )}
            </div>
            <div className={`max-w-[90%] px-3 py-2.5 text-sm ${mine ? 'chat-out' : 'chat-in'}`}>
              {msg.text && <p>{msg.text}</p>}
              {msg.audio_path && (
                <audio controls className="mt-1 max-w-full" style={{ height: 32 }}>
                  <source src={`${ORIGIN}${msg.audio_path}`} />
                </audio>
              )}
              {msg.is_query && <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--danger)' }}>⚠ Needs Clarification</p>}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </>
  );
}
