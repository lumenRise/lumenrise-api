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
  CREDENTIAL_ENCRYPTION_KEY: string;
}

export type { RuntimeConfiguration };
