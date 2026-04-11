import express from 'express';
import cors from 'cors';
import logger from './middleware/logger.js';
import requireAuth from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import workflowRoutes from './routes/workflow.js';
import executeRoutes from './routes/execute.js';
import auditRoutes from './routes/audit.js';
import connectorsRoutes from './routes/connectors.js';
import chatRoutes from './routes/chat.js';

const app = express();

// ── Global middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(logger);

// ── Health check (no auth) ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── Public routes (no auth required) ──
app.use('/api/auth', authRoutes);

// ── Protected routes (JWT auth required) ──
app.use('/api/connectors', requireAuth, connectorsRoutes);
app.use('/api/workflow', requireAuth, workflowRoutes);
app.use('/api', requireAuth, executeRoutes);
app.use('/api/audit', requireAuth, auditRoutes);
app.use('/api/chat', requireAuth, chatRoutes);

// ── Global error handler (must be last) ──
app.use(errorHandler);

export default app;
