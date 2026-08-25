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
});
const source =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' ? undefined : 'file';
const env = createEnv(schema, { source });

export default env;
