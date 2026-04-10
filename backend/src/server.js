import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import connectDB from '../config/db.js';
import env from '../config/env.js';

const server = http.createServer(app);

// ── Socket.io ──
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
  });
});

// ── Start ──
async function start() {
  try {
    await connectDB();

    server.listen(env.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║   🚀 Agentic MCP Gateway — Backend Running       ║
║   Port:    ${String(env.PORT).padEnd(38)}║
║   Env:     ${String(env.NODE_ENV).padEnd(38)}║
║   Socket:  Enabled                                ║
╚═══════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error('💥 Failed to start server:', err);
    process.exit(1);
  }
}

start();

export { io };
