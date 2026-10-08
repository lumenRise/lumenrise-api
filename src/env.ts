import { createEnv, defineConfig } from 'envyra';

const schema = defineConfig({
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'test', 'production'],
    default: 'development',
  },
  PORT: {
    type: 'number',
    default: 5000,
  },
  LOG_LEVEL: {
    type: 'enum',
    values: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
  },
  DB_URI: {
    default: 'mongodb://127.0.0.1:27017?replicaSet=rs0&directConnection=true',
  },
  DB_NAME: {
    default: 'lumenrise',
  },
  RABBITMQ_URL: {
    default: 'amqp://127.0.0.1:5672',
  },
  CLIENT_ORIGIN: {
    default: 'http://localhost:5173',
  },
  SESSION_TTL_DAYS: {
    type: 'number',
    default: 30,
  },
  AUTH_JWT_SECRET: {
    default: '',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  STELLAR_AUTH_NETWORK: {
    type: 'enum',
    values: ['testnet', 'public'],
    default: 'testnet',
  },
  GITHUB_CLIENT_ID: {
    default: '',
    example: 'gho_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  GITHUB_CLIENT_SECRET: {
    default: '',
    example: 'ghs_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  GITHUB_CALLBACK_URL: {
    default: 'http://localhost:5000/v1/oauth/github/callback',
  },
  X_CLIENT_ID: {
    default: '',
    example: 'x_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  X_CLIENT_SECRET: {
    default: '',
    description: 'X OAuth 2.0 application client secret.',
  },
  X_CALLBACK_URL: {
    default: 'http://localhost:5000/v1/oauth/x/callback',
    description: 'X OAuth callback URL registered for the application.',
  },
  STELLAR_HORIZON_URL: {
    default: 'https://horizon-testnet.stellar.org',
    description: 'Horizon base URL used for read-only Stellar account lookups.',
  },
  STELLAR_TESTNET_HORIZON_URL: {
    default: 'https://horizon-testnet.stellar.org',
    description: 'Horizon endpoint for testnet Home Domain verification.',
  },
  STELLAR_PUBLIC_HORIZON_URL: {
    default: 'https://horizon.stellar.org',
    description: 'Horizon endpoint for public Home Domain verification.',
  },
  STELLAR_TESTNET_HOME_DOMAIN: {
    default: '',
    description: 'Managed SEP-1 hostname for testnet, when enabled.',
  },
  STELLAR_PUBLIC_HOME_DOMAIN: {
    default: '',
    description: 'Managed SEP-1 hostname for the public network, when enabled.',
  },
  R2_ENDPOINT: {
    default: '',
    description: 'Cloudflare R2 S3 endpoint for profile images.',
  },
  R2_ACCESS_KEY_ID: {
    default: '',
    description: 'Cloudflare R2 access key ID.',
  },
  R2_SECRET_ACCESS_KEY: {
    default: '',
    secret: true,
    description: 'Cloudflare R2 secret access key.',
  },
  R2_BUCKET_NAME: {
    default: '',
    example: 'my-bucket-name',
  },
  R2_PUBLIC_BASE_URL: {
    default: '',
    example: 'https://images.lumenrise.app',
  },
  R2_MAX_AVATAR_BYTES: {
    type: 'number',
    default: 5_242_880,
  },
  CREDENTIAL_ENCRYPTION_KEY: {
    default: '',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
});

const source =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' ? undefined : 'file';

const env = createEnv(schema, { source });

export default env;
