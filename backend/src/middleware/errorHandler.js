import env from '../../config/env.js';

/**
 * Global Express error handler.
 * Formats: { error, code, details? }
 * Shows stack/details only in development.
 */
export default function errorHandler(err, req, res, _next) {
  console.error('🔴 Unhandled error:', err);

  const status = err.status || err.statusCode || 500;
  const response = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  };

  if (env.NODE_ENV === 'development') {
    response.details = {
      stack: err.stack,
      ...(err.details || {}),
    };
  }

  res.status(status).json(response);
}
