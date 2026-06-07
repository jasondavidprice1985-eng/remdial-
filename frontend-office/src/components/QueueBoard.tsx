import QueueNav from './QueueNav';
import QueueWorkspace from './QueueWorkspace';
import MobileTicketWorkView from './MobileTicketWorkView';
import { useQueueBoard } from '../hooks/useQueueBoard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Ticket } from '@shared/types';

interface Props {
  tickets: Ticket[];
  onUpdate: (ticket: Ticket) => void;
}

export default function QueueBoard({ tickets, onUpdate }: Props) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const board = useQueueBoard(tickets, onUpdate, isDesktop);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <QueueNav active={board.queue} counts={board.counts} unread={board.unread} onChange={board.pickQueue} />
        {board.counts.inbox > 0 && board.queue !== 'inbox' && (
          <button type="button" onClick={() => board.pickQueue('inbox')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100"
            style={{ color: '#7c3aed' }}>
            ● {board.counts.inbox} new in inbox
          </button>
        )}
        {board.counts.query > 0 && board.queue !== 'query' && (
          <button type="button" onClick={() => board.pickQueue('query')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-[var(--query)] bg-red-50 border border-red-100 hover:bg-red-100">
            ⚠ {board.counts.query} need clarification
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 glass-panel overflow-hidden">
        {!board.showMobileWork && (
          <QueueWorkspace
            queueTickets={board.queueTickets}
            selected={board.selected}
            isDesktop={isDesktop}
            onSelect={board.setSelected}
            onUpdate={board.handleUpdate}
            onDeselect={board.goHome}
          />
        )}
        {board.showMobileWork && board.selected && (
          <MobileTicketWorkView
            ticket={board.selected}
            onClose={() => board.setSelected(null)}
            onUpdate={board.handleUpdate}
          />
        )}
      </div>
    </div>
  );
}
