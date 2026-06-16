import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

export default function useSocketRefresh(
  socket: Socket | null,
  eventNames: string[],
  callback: (...args: unknown[]) => void
): void {
  useEffect(() => {
    if (!socket || !eventNames.length) return;
    eventNames.forEach((ev) => socket.on(ev, callback));
    return () => {
      eventNames.forEach((ev) => socket.off(ev, callback));
    };
  }, [socket, eventNames, callback]);
}
