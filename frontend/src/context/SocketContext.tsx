import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL, getAuthToken } from '../lib/api';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = (): Socket | null => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL, {
        auth: { token: getAuthToken() },
      });
      setSocket(newSocket);

      return () => { newSocket.close(); };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
