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
  PRIVY_APP_ID: {
    default: '',
  },
  PRIVY_APP_SECRET: {
    default: '',
    secret: true,
  },
  AUTH_PROVIDER_API_URL: {
    example: 'https://identity.example',
  },
  AUTH_PROVIDER_APP_ID: {
    example: 'application-id',
  },
  AUTH_PROVIDER_APP_SECRET: {
    example: 'application-secret',
    secret: true,
  },
  GITHUB_CLIENT_ID: {
    example: 'gho_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  GITHUB_CLIENT_SECRET: {
    example: 'ghs_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  GITHUB_CALLBACK_URL: {
    default: 'http://localhost:5000/v1/oauth/github/callback',
  },
  X_CLIENT_ID: {
    example: 'x_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  X_CLIENT_SECRET: {
    description: 'X OAuth 2.0 application client secret.',
  },
  X_CALLBACK_URL: {
    default: 'http://localhost:5000/v1/oauth/x/callback',
    description: 'X OAuth callback URL registered for the application.',
  },
  R2_ENDPOINT: {
    example: 'https://<account_id>.r2.cloudflarestorage.com',
  },
  R2_ACCESS_KEY_ID: {
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  R2_SECRET_ACCESS_KEY: {
    secret: true,
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  R2_BUCKET_NAME: {
    example: 'my-bucket-name',
  },
  R2_PUBLIC_BASE_URL: {
    example: 'https://images.lumenrise.app',
  },
  R2_MAX_IMAGE_BYTES: {
    type: 'number',
    default: 2_097_152,
  },
  CREDENTIAL_ENCRYPTION_KEY: {
    default: '',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  BASE_TESTNET_RPC_URL: { default: '' },
  BASE_PUBLIC_RPC_URL: { default: '' },
  BASE_TESTNET_FACTORY_ADDRESS: { default: '' },
  BASE_PUBLIC_FACTORY_ADDRESS: { default: '' },
  BASE_TESTNET_DEPLOYMENT_BLOCK: { default: '' },
  BASE_PUBLIC_DEPLOYMENT_BLOCK: { default: '' },
  BASE_LOG_BATCH_SIZE: { type: 'number', default: 500 },
  STELLAR_TESTNET_RPC_URL: {
    default: 'https://soroban-testnet.stellar.org',
  },
  STELLAR_TESTNET_HORIZON_URL: {
    default: 'https://horizon-testnet.stellar.org',
  },
  LAUNCH_TESTNET_FACTORY_CONTRACT_ID: {
    default: '',
  },
  STELLAR_TESTNET_HOME_DOMAIN: {
    default: '',
  },
  STELLAR_TESTNET_TOML_DIRNAME: {
    default: './storage/testnet',
  },
  STELLAR_TESTNET_TOML_FILENAME: {
    default: 'stellar.toml',
  },
  TESTNET_TOML: {
    default: '',
  },
  STELLAR_PUBLIC_RPC_URL: {
    default: '',
  },
  STELLAR_PUBLIC_HORIZON_URL: {
    default: 'https://horizon.stellar.org',
  },
  LAUNCH_PUBLIC_FACTORY_CONTRACT_ID: {
    default: '',
  },
  STELLAR_PUBLIC_HOME_DOMAIN: {
    default: '',
  },
  STELLAR_PUBLIC_TOML_DIRNAME: {
    default: './storage/public',
  },
  STELLAR_PUBLIC_TOML_FILENAME: {
    default: 'stellar.toml',
  },
  PUBLIC_TOML: {
    default: '',
  },
  STELLAR_LEGACY_NETWORK: {
    type: 'enum',
    values: ['testnet', 'public'],
    required: false,
  },
});

const source =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' ? undefined : 'file';

const env = createEnv(schema, { source });

export default env;
