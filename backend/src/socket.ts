import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { validateCreatePayload, createTicket } from './services/ticketService';

export function setupSocket(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { username: string; role: string };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[SOCKET] Connected  id=${socket.id} transport=${socket.conn.transport.name}`);

    socket.on('client:identify', ({ role }: { role: 'manager' | 'office' }) => {
      const userRole = socket.data.user?.role;
      if (userRole && userRole !== role) {
        console.warn(`[SOCKET] Role mismatch: token says ${userRole}, client claims ${role}`);
      }
      socket.data.role = role;
      console.log(`[SOCKET] Identified id=${socket.id} role=${role}`);
      if (role === 'office') {
        socket.join('office');
        console.log(`[SOCKET] Joined "office" room  id=${socket.id}`);
      } else if (role === 'manager') {
        socket.join('manager');
        console.log(`[SOCKET] Joined "manager" room  id=${socket.id}`);
      }
    });

    socket.on('ticket:join', ({ ticketId }: { ticketId: string }) => {
      const room = `job_${ticketId}`;
      socket.join(room);
      const size = io.sockets.adapter.rooms.get(room)?.size ?? 0;
      console.log(`[SOCKET] Joined room="${room}" id=${socket.id} role=${socket.data.role} members=${size}`);
    });

    socket.on('ticket:leave', ({ ticketId }: { ticketId: string }) => {
      socket.leave(`job_${ticketId}`);
      console.log(`[SOCKET] Left room="job_${ticketId}" id=${socket.id}`);
    });

    socket.on('ticket:submit', async (payload: Record<string, unknown>, ackCallback?: (r: unknown) => void) => {
      const t0 = Date.now();
      console.log(`[SOCKET] ticket:submit  id=${socket.id} role=${socket.data.role} developer="${payload.developer}"`);

      const err = validateCreatePayload(payload);
      if (err) {
        console.warn(`[SOCKET] ticket:submit validation fail: ${err}`);
        socket.emit('report_error', { error: err });
        ackCallback?.({ error: err });
        return;
      }
      try {
        const ticket = await createTicket(payload as unknown as Parameters<typeof createTicket>[0]);
        const elapsed = Date.now() - t0;
        console.log(`[SOCKET] ticket created ${ticket.ref} in ${elapsed}ms — emitting ack to id=${socket.id}`);

        io.to('office').emit('ticket:created', { ticket });

        const ackPayload = { ticketId: ticket.id, ref: ticket.ref };
        socket.emit('report_acknowledged', ackPayload);
        socket.emit('ticket:submitted', { ticket });
        ackCallback?.(ackPayload);

        console.log(`[SOCKET] report_acknowledged + ticket:submitted sent to id=${socket.id} connected=${socket.connected}`);
      } catch (e) {
        console.error('[SOCKET] ticket:submit error:', e);
        const errMsg = { error: 'Internal server error' };
        socket.emit('report_error', errMsg);
        ackCallback?.(errMsg);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected id=${socket.id} role=${socket.data.role ?? '?'} reason=${reason}`);
    });
  });
}
