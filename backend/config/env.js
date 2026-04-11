import dotenv from 'dotenv';
dotenv.config();

const required = [
  'PORT',
  'MONGODB_URI',
  'GROQ_API_KEY',
  'JWT_SECRET',
];

// Accept either MONGODB_URI or MONGO_URI
if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n  ${missing.join('\n  ')}\nSee .env.example for details.`
  );
}

const env = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 3001,
  MONGODB_URI: process.env.MONGODB_URI,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  APP_API_KEY: process.env.APP_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
});

export default env;
