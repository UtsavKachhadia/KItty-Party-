import env from '../../config/env.js';

/**
 * Simple API key authentication middleware.
 * Checks x-api-key header against APP_API_KEY.
 * Skips auth for GET /health.
 */
export default function auth(req, res, next) {
  // Skip auth for health check
  if (req.method === 'GET' && req.path === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== env.APP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_FAILED' });
  }

  next();
}
