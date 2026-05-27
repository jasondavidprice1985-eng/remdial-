import React from 'react';
import { TicketStatus } from '@shared/types';

const STYLES: Record<TicketStatus, React.CSSProperties> = {
  pending:  { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  query:    { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  ordered:  { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  archived: { background: '#f5f5f4', color: '#78716c', border: '1px solid #e7e5e4' },
};

const LABELS: Record<TicketStatus, string> = {
  pending: 'PENDING', query: 'QUERY', ordered: 'ORDERED', archived: 'ARCHIVED',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full tracking-wide shrink-0 ${status === 'query' ? 'animate-query-pulse' : ''}`}
      style={STYLES[status]}>{LABELS[status]}</span>
  );
}
