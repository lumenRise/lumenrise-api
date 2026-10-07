interface RuntimeConfiguration {
  NODE_ENV: 'development' | 'test' | 'production';
  CLIENT_ORIGIN: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_CALLBACK_URL: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_CALLBACK_URL: string;
  STELLAR_HORIZON_URL: string;
  STELLAR_TESTNET_HORIZON_URL: string;
  STELLAR_PUBLIC_HORIZON_URL: string;
  STELLAR_TESTNET_HOME_DOMAIN: string;
  STELLAR_PUBLIC_HOME_DOMAIN: string;
  STELLAR_AUTH_NETWORK: 'testnet' | 'public';
  AUTH_JWT_SECRET: string;
  CREDENTIAL_ENCRYPTION_KEY: string;
}

export type { RuntimeConfiguration };
