import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../auth/apiClient';

interface Suggestion {
  name: string;
  count: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  /**
   * Build the URL (with query params) that returns { suggestions: [{name, count}] }.
   * Receives the current typed query. Return null to skip fetching
   * (e.g. parent field not filled yet).
   */
  buildUrl: (query: string) => string | null;
  /** Re-fetch suggestions when these dependencies change (parent values). */
  deps?: unknown[];
}

export default function SapCombobox({ value, onChange, placeholder, disabled, required, buildUrl, deps = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset suggestions when dependencies change (e.g. developer changed -> wipe sites)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSuggestions([]); }, deps);

  useEffect(() => {
    if (!open) return;
    const url = buildUrl(value);
    if (!url) { setSuggestions([]); return; }
    setLoading(true);
    const controller = new AbortController();
    apiFetch(url, { signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error('lookup failed');
        const data = await r.json();
        setSuggestions(data.suggestions || []);
      })
      .catch(() => { /* ignore — aborted or offline */ })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, ...deps]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-[var(--border)] rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-3 text-[13px] text-[var(--subtle)]">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-3 text-[13px] text-[var(--subtle)]">
              {value.trim() ? `No matches. "${value.trim()}" will be used as typed.` : 'Start typing to search'}
            </div>
          )}
          {suggestions.map(s => (
            <button
              key={s.name}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(s.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-[14px] hover:bg-[var(--surface-2)] flex items-center justify-between gap-3 border-b border-[var(--border)] last:border-b-0"
            >
              <span className="truncate text-[var(--text)]">{s.name}</span>
              <span className="text-[11.5px] text-[var(--subtle)] tabular-nums shrink-0">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
