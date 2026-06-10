import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../auth/apiClient';

interface Product {
  sap_code: string;
  description: string;
}

interface Props {
  value: string;
  onChange: (description: string, sapCode?: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function DescriptionTypeahead({
  value, onChange, placeholder = 'e.g. Soft close hinge',
  maxLength = 200, autoFocus, disabled,
}: Props) {
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    try {
      const res = await apiFetch(`/products/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: Product[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      // typeahead is best-effort
    }
  }, []);

  function handleChange(next: string) {
    // Freeform typing clears any previous SAP code
    onChange(next, undefined);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(next), 300);
  }

  function pickProduct(p: Product) {
    onChange(p.description, p.sap_code);
    setOpen(false);
    setResults([]);
    apiFetch(`/products/${encodeURIComponent(p.sap_code)}/pick`, { method: 'POST' }).catch(() => {});
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pickProduct(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0 && value.trim().length >= 2) setOpen(true); }}
        maxLength={maxLength}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[var(--border-strong)] rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((p, idx) => (
            <button
              key={p.sap_code}
              type="button"
              onClick={() => pickProduct(p)}
              className={`w-full text-left px-3 py-2 border-b border-[var(--border)] last:border-b-0 transition-colors ${
                idx === activeIndex ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="font-mono text-[13px] font-semibold text-[var(--text)] leading-tight">
                {p.sap_code}
              </div>
              <div className="text-[12px] text-[var(--subtle)] truncate mt-0.5">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
