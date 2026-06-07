import React from 'react';
import { Ticket, TicketStatus } from '@shared/types';

const STYLES: Record<TicketStatus | 'accepted', React.CSSProperties> = {
  pending:  { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  accepted: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' },
  query:    { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  ordered:  { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  archived: { background: '#f5f5f4', color: '#78716c', border: '1px solid #e7e5e4' },
};

const LABELS: Record<TicketStatus | 'accepted', string> = {
  pending: 'PENDING', accepted: 'ACCEPTED', query: 'QUERY', ordered: 'ORDERED', archived: 'ARCHIVED',
};

interface Props {
  status: TicketStatus;
  ticket?: Ticket;
}

export default function StatusBadge({ status, ticket }: Props) {
  const effective = ticket && status === 'pending' && ticket.accepted_at
    ? 'accepted'
    : status;
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full tracking-wide shrink-0 ${status === 'query' ? 'animate-query-pulse' : ''}`}
      style={STYLES[effective]}>{LABELS[effective]}</span>
  );
}
