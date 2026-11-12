import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

const resolveSocketUrl = (): string => {
  const runtimeConfig = (globalThis as any).window?.__INSTAFLOW_CONFIG__ ?? {};
  const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  if (runtimeConfig.SOCKET_URL) return runtimeConfig.SOCKET_URL;
  return API_URL.replace(/\/api\/?$/, '');
};

let socket: Socket | null = null;

export const getSocket = (token?: string | null): Socket => {
  if (socket) return socket;
  socket = io(resolveSocketUrl(), {
    path: '/socket.io',
    auth: (cb) => cb({ token: token ?? localStorage.getItem('instaflow.accessToken') }),
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
