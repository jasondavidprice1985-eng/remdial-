interface Props {
  text: string;
  isQuery: boolean;
  sending: boolean;
  recording: boolean;
  onTextChange: (v: string) => void;
  onQueryChange: (v: boolean) => void;
  onSend: () => void;
  onMicClick: () => void;
}

export default function ChatInputBar({ text, isQuery, sending, recording, onTextChange, onQueryChange, onSend, onMicClick }: Props) {
  return (
    <div className="border-t border-[var(--border)] p-3 space-y-2 shrink-0 bg-[var(--surface)]">
      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
        <input type="checkbox" checked={isQuery} onChange={e => onQueryChange(e.target.checked)} disabled={sending} className="accent-[var(--query)]" />
        <span className={isQuery ? 'text-[var(--query)] font-semibold' : 'text-[var(--muted)]'}>Flag as Needs Clarification</span>
      </label>
      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="Type a message…" value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={sending} />
        <button onClick={onSend} disabled={!text.trim() || sending}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40 bg-[var(--pending)]">Send</button>
        <button onClick={onMicClick} disabled={sending}
          className={`rounded-lg px-3 py-2 text-xs border border-[var(--border)] bg-[var(--surface-2)] ${recording ? 'bg-[var(--query)] text-white border-transparent' : ''}`}>
          {recording ? '⏹' : '🎤'}
        </button>
      </div>
    </div>
  );
}
