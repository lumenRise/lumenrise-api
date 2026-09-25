interface RuntimeConfiguration {
  NODE_ENV: 'development' | 'test' | 'production';
  CLIENT_ORIGIN: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_CALLBACK_URL: string;
  GITLAB_BASE_URL: string;
  GITLAB_CLIENT_ID: string;
  GITLAB_CLIENT_SECRET: string;
  GITLAB_CALLBACK_URL: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_CALLBACK_URL: string;
  X_AUTO_SYNC_INTERVAL_HOURS: number;
  STELLAR_HORIZON_URL: string;
  STELLAR_RPC_URL: string;
  STELLAR_AUTH_NETWORK: 'testnet' | 'public';
  AUTH_JWT_SECRET: string;
  CREDENTIAL_ENCRYPTION_KEY: string;
}

export type { RuntimeConfiguration };
