import dotenv from 'dotenv';
dotenv.config();

const required = [
  'PORT',
  'MONGODB_URI',
  'GROQ_API_KEY',
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
  JWT_SECRET: process.env.JWT_SECRET || 'secret',
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  APP_API_KEY: process.env.APP_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  CREDENTIAL_SECRET: process.env.CREDENTIAL_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY,
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',
});

export default env;
