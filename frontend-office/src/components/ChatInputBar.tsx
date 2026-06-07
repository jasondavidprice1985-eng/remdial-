import { useRef } from 'react';

interface Props {
  text: string;
  isQuery: boolean;
  sending: boolean;
  recording: boolean;
  onTextChange: (v: string) => void;
  onQueryChange: (v: boolean) => void;
  onSend: () => void;
  onMicClick: () => void;
  onPhotoSelect: (file: File) => void;
}

export default function ChatInputBar({ text, isQuery, sending, recording, onTextChange, onQueryChange, onSend, onMicClick, onPhotoSelect }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-[var(--border)] p-3 space-y-2 shrink-0 bg-[var(--surface)]">
      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
        <input type="checkbox" checked={isQuery} onChange={e => onQueryChange(e.target.checked)} disabled={sending} className="accent-[var(--query)]" />
        <span className={isQuery ? 'text-[var(--query)] font-semibold' : 'text-[var(--muted)]'}>Flag as Needs Clarification</span>
      </label>
      <div className="flex gap-2 items-center">
        <input className="input-field flex-1" placeholder="Type a message…" value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={sending} />
        <button onClick={onSend} disabled={!text.trim() || sending}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40 bg-[var(--pending)]">Send</button>
        <button onClick={() => fileRef.current?.click()} disabled={sending}
          className="rounded-lg w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
          title="Send photo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onPhotoSelect(f);
            if (fileRef.current) fileRef.current.value = '';
          }} />
        <button onClick={onMicClick} disabled={sending}
          className={`rounded-lg w-10 h-10 shrink-0 flex items-center justify-center text-xs border border-[var(--border)] bg-[var(--surface-2)] ${recording ? 'bg-[var(--query)] text-white border-transparent' : ''}`}
          title={recording ? 'Stop recording' : 'Record voice note'}>
          {recording ? '⏹' : '🎤'}
        </button>
      </div>
    </div>
  );
}
