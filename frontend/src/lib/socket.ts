import { io, Socket } from 'socket.io-client';
import { getApiUrl } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const socketUrl = getApiUrl();

  socket = io(socketUrl, {
    auth: {
      token: token || '',
    },
    autoConnect: false,
    transports: ['websocket'],
  });

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (s && token) {
    s.auth = { token };
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
