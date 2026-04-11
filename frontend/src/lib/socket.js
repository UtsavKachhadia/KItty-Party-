import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:3001`;

const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
