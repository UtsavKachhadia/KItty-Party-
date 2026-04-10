import express from 'express';
import cors from 'cors';
import logger from './middleware/logger.js';
import auth from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import workflowRoutes from './routes/workflow.js';
import executeRoutes from './routes/execute.js';
import auditRoutes from './routes/audit.js';
import connectorsRoutes from './routes/connectors.js';

const app = express();

// ── Global middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(logger);

// ── Health check (no auth) ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── Auth for all /api/* routes ──
app.use('/api', auth);

// ── Mount routes ──
app.use('/api/workflow', workflowRoutes);
app.use('/api', executeRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/connectors', connectorsRoutes);

// ── Global error handler (must be last) ──
app.use(errorHandler);

export default app;
