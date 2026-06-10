import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../auth/apiClient';

interface Product {
  sap_code: string;
  description: string;
}

interface Props {
  /** Current SAP code value */
  sapCode: string;
  /** Current description value */
  description: string;
  /** Called when user picks a product or types manually */
  onSelect: (sapCode: string, description: string) => void;
  disabled?: boolean;
}

export default function ProductTypeahead({ sapCode, description, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Which field is being used to search
  const [searchField, setSearchField] = useState<'description' | 'sap'>('description');

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await apiFetch(`/products/search?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
      if (res.ok) {
        const data: Product[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      // Silently fail — typeahead is a nice-to-have
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDescriptionChange(value: string) {
    onSelect(sapCode, value);
    setQuery(value);
    setSearchField('description');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  }

  function handleSapChange(value: string) {
    onSelect(value, description);
    setQuery(value);
    setSearchField('sap');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  }

  function pickProduct(product: Product) {
    onSelect(product.sap_code, product.description);
    setOpen(false);
    setResults([]);
    setQuery('');
    apiFetch(`/products/${encodeURIComponent(product.sap_code)}/pick`, { method: 'POST' }).catch(() => {});
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup timer and abort controller on unmount
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  function highlightText(text: string, query: string): string {
    if (!query.trim()) return text;
    const tokens = query.split(/\s+/).filter(Boolean);
    let result = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    for (const token of tokens) {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedToken})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 rounded-sm px-0.5">$1</mark>');
    }
    return result;
  }

  return (
    <div ref={wrapRef} className="relative col-span-10 grid grid-cols-10 gap-1.5">
      <input
        className="input-field col-span-7 text-xs"
        placeholder="Description — start typing to search"
        value={description}
        onChange={e => handleDescriptionChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0 && searchField === 'description') setOpen(true); }}
        disabled={disabled}
      />
      <input
        className="input-field col-span-3 text-xs font-mono uppercase"
        placeholder="SAP code"
        value={sapCode}
        onChange={e => handleSapChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0 && searchField === 'sap') setOpen(true); }}
        disabled={disabled}
      />

      {loading && !open && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 px-3 py-2 text-xs text-[var(--faint)] flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border border-[var(--border)] border-t-transparent animate-spin"></span>
          Searching products…
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((product, idx) => (
            <button
              key={product.sap_code}
              type="button"
              onClick={() => pickProduct(product)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs border-b border-[var(--border)] last:border-b-0 transition-colors ${
                idx === activeIndex ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
              }`}
            >
              <span className="font-mono font-semibold text-[var(--pending)] shrink-0 w-20 truncate uppercase" dangerouslySetInnerHTML={{ __html: highlightText(product.sap_code, query) }} />
              <span className="text-[var(--text)] truncate" dangerouslySetInnerHTML={{ __html: highlightText(product.description, query) }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
