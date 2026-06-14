import QueueNav from './QueueNav';
import QueueWorkspace from './QueueWorkspace';
import { useQueueBoard } from '../hooks/useQueueBoard';
import { Ticket } from '@shared/types';

interface Props {
  tickets: Ticket[];
  onUpdate: (ticket: Ticket) => void;
}

export default function QueueBoard({ tickets, onUpdate }: Props) {
  const board = useQueueBoard(tickets, onUpdate);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-6 shrink-0 border-b border-[var(--border)] px-1">
        <QueueNav active={board.queue} counts={board.counts} unread={board.unread} onChange={board.pickQueue} />
        <div className="flex-1" />
        {board.counts.inbox > 0 && board.queue !== 'inbox' && (
          <button type="button" onClick={() => board.pickQueue('inbox')}
            className="text-[12px] text-[var(--subtle)] hover:text-[var(--text)] inline-flex items-center gap-1.5 transition-colors">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--inbox)]" />
            {board.counts.inbox} new in inbox
          </button>
        )}
        {board.counts.query > 0 && board.queue !== 'query' && (
          <button type="button" onClick={() => board.pickQueue('query')}
            className="text-[12px] text-[var(--query)] inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--query)]" />
            {board.counts.query} need clarification
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden mt-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
        <QueueWorkspace
          queueTickets={board.queueTickets}
          selected={board.selected}
          onSelect={board.setSelected}
          onUpdate={board.handleUpdate}
          onDeselect={board.goHome}
        />
      </div>
    </div>
  );
}
