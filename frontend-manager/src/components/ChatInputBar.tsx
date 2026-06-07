import { useRef } from 'react';

interface Props {
  text: string;
  sending: boolean;
  recording: boolean;
  onTextChange: (v: string) => void;
  onSend: () => void;
  onMicClick: () => void;
  onPhotoSelect: (file: File) => void;
}

export default function ChatInputBar({ text, sending, recording, onTextChange, onSend, onMicClick, onPhotoSelect }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-[var(--border)] p-2 flex gap-2 shrink-0 glass items-center">
      <input className="input-field flex-1" placeholder="Type a message…" value={text}
        onChange={e => onTextChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        disabled={sending} />
      <button onClick={onSend} disabled={!text.trim() || sending} className="btn-accent px-4 py-2 text-sm shrink-0">Send</button>
      <button onClick={() => fileRef.current?.click()} disabled={sending}
        className="rounded-lg w-11 h-11 shrink-0 flex items-center justify-center"
        style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        title="Send photo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onPhotoSelect(f);
          if (fileRef.current) fileRef.current.value = '';
        }} />
      <button onClick={onMicClick} disabled={sending}
        className="rounded-lg w-11 h-11 shrink-0 flex items-center justify-center text-base"
        style={{ background: recording ? 'var(--danger)' : 'var(--surface-2)', color: recording ? '#fff' : 'var(--text)', border: '1px solid var(--border)' }}
        title={recording ? 'Stop recording' : 'Record voice note'}>
        {recording ? '⏹' : '🎤'}
      </button>
    </div>
  );
}
