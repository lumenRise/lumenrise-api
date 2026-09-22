import { createEnv, defineConfig } from 'envyra';

const schema = defineConfig({
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'test', 'production'],
    default: 'development',
    description: 'Application runtime environment.',
  },
  PORT: {
    type: 'number',
    default: 5000,
    description: 'HTTP port the server listens on.',
  },
  LOG_LEVEL: {
    type: 'enum',
    values: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    description: 'Logging verbosity.',
  },
  DB_URI: {
    default: 'mongodb://127.0.0.1:27017?replicaSet=rs0&directConnection=true',
    description: 'MongoDB connection string.',
  },
  DB_NAME: {
    default: 'lumenrise',
    description: 'MongoDB database name.',
  },
  CLIENT_ORIGIN: {
    default: 'http://localhost:5173',
    description: 'Browser client origin allowed to send credentialed requests.',
  },
  SESSION_TTL_DAYS: {
    type: 'number',
    default: 30,
    description: 'Number of days a Lumenrise session remains valid.',
  },
  SYNC_WORKER_POLL_INTERVAL_MS: {
    type: 'number',
    default: 2_000,
    description: 'Delay between background synchronization queue polls.',
  },
  GITHUB_CLIENT_ID: {
    default: '',
    description: 'GitHub OAuth application client ID.',
  },
  GITHUB_CLIENT_SECRET: {
    default: '',
    description: 'GitHub OAuth application client secret.',
  },
  GITHUB_CALLBACK_URL: {
    default: 'http://localhost:5000/v1/oauth/github/callback',
    description: 'GitHub OAuth callback URL registered for the application.',
  },
  CREDENTIAL_ENCRYPTION_KEY: {
    default: '',
    description: '64-character hexadecimal key used to encrypt provider credentials.',
  },
});
const source =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' ? undefined : 'file';
const env = createEnv(schema, { source });

export default env;
