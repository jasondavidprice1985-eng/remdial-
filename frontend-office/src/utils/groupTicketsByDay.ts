import { Ticket } from '@shared/types';

export interface DayGroup {
  label: string;
  tickets: Ticket[];
}

export function groupTicketsByDay(tickets: Ticket[]): DayGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());

  const groups: Record<string, Ticket[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  tickets.forEach(ticket => {
    const ticketDate = new Date(ticket.created_at);
    const ticketDay = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());

    if (ticketDay.getTime() === today.getTime()) {
      groups.today.push(ticket);
    } else if (ticketDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(ticket);
    } else if (ticketDay.getTime() >= weekStart.getTime()) {
      groups.week.push(ticket);
    } else {
      groups.earlier.push(ticket);
    }
  });

  const result: DayGroup[] = [];
  if (groups.today.length > 0) result.push({ label: 'Today', tickets: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: 'Yesterday', tickets: groups.yesterday });
  if (groups.week.length > 0) result.push({ label: 'This week', tickets: groups.week });
  if (groups.earlier.length > 0) result.push({ label: 'Earlier', tickets: groups.earlier });

  return result;
}
