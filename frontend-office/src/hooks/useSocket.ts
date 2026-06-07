import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || undefined;

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, { autoConnect: false });
  }
  return _socket;
}

export function useSocket(token: string | null): Socket {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!token) {
      if (socket.connected) socket.disconnect();
      return;
    }
    function identify() { socket.emit('client:identify', { role: 'office' }); }
    socket.auth = { token };
    // Re-identify on every (re)connect — socket.io auto-reconnects after
    // network blips; without this we'd silently drop out of the 'office'
    // room and stop receiving ticket:updated broadcasts.
    socket.on('connect', identify);
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    } else {
      socket.connect();
    }
    return () => { socket.off('connect', identify); };
  }, [token]);

  return socketRef.current;
}
