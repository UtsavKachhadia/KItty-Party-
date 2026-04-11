import dotenv from 'dotenv';
dotenv.config();

const required = [
  'PORT',
  'MONGODB_URI',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'GROQ_API_KEY',
  'GITHUB_TOKEN',
  'SLACK_BOT_TOKEN',
  'JIRA_BASE_URL',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN',
  'APP_API_KEY',
  'JWT_SECRET',
  'CREDENTIAL_ENCRYPTION_KEY',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n  ${missing.join('\n  ')}\nSee .env.example for details.`
  );
}

if (process.env.CREDENTIAL_ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).\n' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

const env = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 3001,
  MONGODB_URI: process.env.MONGODB_URI,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_EMAIL: process.env.JIRA_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  APP_API_KEY: process.env.APP_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
});

export default env;
