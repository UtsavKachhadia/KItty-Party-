import { io } from 'socket.io-client';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
