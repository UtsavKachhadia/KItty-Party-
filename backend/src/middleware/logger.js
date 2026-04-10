import morgan from 'morgan';
import env from '../../config/env.js';

/**
 * Request logger middleware.
 * Uses "dev" format in development, "combined" in production.
 */
const logger = env.NODE_ENV === 'production' ? morgan('combined') : morgan('dev');

export default logger;
