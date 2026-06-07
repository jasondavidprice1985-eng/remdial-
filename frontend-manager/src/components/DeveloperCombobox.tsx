import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../auth/apiClient';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

export default function DeveloperCombobox({ value, onChange, disabled }: Props) {
  const [matches, setMatches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) { setMatches([]); return; }
    const t = setTimeout(() => {
      apiFetch(`/developers?q=${encodeURIComponent(value.trim())}`)
        .then(r => r.json()).then(d => setMatches(d.developers || [])).catch(() => setMatches([]));
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input className="input-field" placeholder="Developer *" maxLength={100} value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        disabled={disabled} required autoComplete="off" />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-[var(--border)] rounded-xl shadow-lg max-h-40 overflow-y-auto">
          {matches.map(m => (
            <li key={m}>
              <button type="button" className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                onClick={() => { onChange(m); setOpen(false); }}>{m}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
