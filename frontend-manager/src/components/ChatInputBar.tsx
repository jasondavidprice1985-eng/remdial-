interface Props {
  text: string;
  sending: boolean;
  recording: boolean;
  onTextChange: (v: string) => void;
  onSend: () => void;
  onMicClick: () => void;
}

export default function ChatInputBar({ text, sending, recording, onTextChange, onSend, onMicClick }: Props) {
  return (
    <div className="border-t border-[var(--border)] p-2 flex gap-2 shrink-0 glass">
      <input className="input-field flex-1" placeholder="Type a message…" value={text}
        onChange={e => onTextChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        disabled={sending} />
      <button onClick={onSend} disabled={!text.trim() || sending} className="btn-accent px-4 py-2 text-sm shrink-0">Send</button>
      <button onClick={onMicClick} disabled={sending} className="rounded-lg px-3 py-2 text-sm shrink-0"
        style={{ background: recording ? 'var(--danger)' : 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
        {recording ? '⏹' : '🎤'}
      </button>
    </div>
  );
}
