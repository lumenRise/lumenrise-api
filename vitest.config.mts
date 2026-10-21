import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      AUTH_PROVIDER_API_URL: 'https://identity.example',
      AUTH_PROVIDER_APP_ID: 'test-app-id',
      AUTH_PROVIDER_APP_SECRET: 'test-app-secret',
      GITHUB_CLIENT_ID: 'test-github-client-id',
      GITHUB_CLIENT_SECRET: 'test-github-client-secret',
      X_CLIENT_ID: 'test-x-client-id',
      X_CLIENT_SECRET: 'test-x-client-secret',
      R2_ENDPOINT: 'https://storage.example',
      R2_ACCESS_KEY_ID: 'test-access-key-id',
      R2_SECRET_ACCESS_KEY: 'test-secret-access-key',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_BASE_URL: 'https://images.example',
    },
  },
});
