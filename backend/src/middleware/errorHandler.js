import env from '../../config/env.js';

/**
 * Global Express error handler.
 * Formats: { success: false, message, code? }
 * Hides raw error details in production.
 */
export default function errorHandler(err, req, res, _next) {
  console.error('🔴 Unhandled error:', err.message);
  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;

  // Mongoose validation error — user-friendly message
  if (err.name === 'ValidationError') {
    const fields = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${fields}`,
    });
  }

  // Duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // Generic error — never expose stack to client
  res.status(status).json({
    success: false,
    message: env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
  });
}
