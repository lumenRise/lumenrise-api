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
    default: 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true',
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
});
const source =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' ? undefined : 'file';
const env = createEnv(schema, { source });

export default env;
