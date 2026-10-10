import { describe, expect, it } from 'vitest';

import type { RuntimeConfiguration } from '../../src/types/configuration';
import validateRuntimeConfiguration from '../../src/services/configuration/validateRuntimeConfiguration';

const validConfiguration: RuntimeConfiguration = {
  NODE_ENV: 'development',
  CLIENT_ORIGIN: 'http://localhost:5173',
  GITHUB_CLIENT_ID: 'github-client-id',
  GITHUB_CLIENT_SECRET: 'github-client-secret',
  GITHUB_CALLBACK_URL: 'http://localhost:5000/v1/oauth/github/callback',
  X_CLIENT_ID: 'x-client-id',
  X_CLIENT_SECRET: 'x-client-secret',
  X_CALLBACK_URL: 'http://localhost:5000/v1/oauth/x/callback',
  STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
  STELLAR_TESTNET_HOME_DOMAIN: 'testnet.lumenrise.app',
  STELLAR_PUBLIC_HOME_DOMAIN: 'lumenrise.app',
  R2_ENDPOINT: '',
  R2_ACCESS_KEY_ID: '',
  R2_SECRET_ACCESS_KEY: '',
  R2_BUCKET_NAME: '',
  R2_PUBLIC_BASE_URL: '',
  R2_MAX_AVATAR_BYTES: 5_242_880,
  R2_MAX_TOKEN_IMAGE_BYTES: 5_242_880,
  STELLAR_AUTH_NETWORK: 'testnet',
  AUTH_JWT_SECRET: 'a'.repeat(32),
  CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(64),
};

describe('runtime configuration validation', () => {
  it('accepts a valid development configuration', () => {
    expect(() => validateRuntimeConfiguration(validConfiguration)).not.toThrow();
  });

  it('rejects incomplete GitHub credentials', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, GITHUB_CLIENT_SECRET: '' }),
    ).toThrow('must be configured together');
  });

  it('rejects incomplete X credentials', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, X_CLIENT_SECRET: '' }),
    ).toThrow('must be configured together');
  });

  it('rejects an invalid Stellar Horizon URL', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, STELLAR_HORIZON_URL: 'not-a-url' }),
    ).toThrow('STELLAR_HORIZON_URL must be a valid absolute URL');
  });

  it('rejects an invalid credential encryption key', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, CREDENTIAL_ENCRYPTION_KEY: 'short' }),
    ).toThrow('64-character hexadecimal key');
  });

  it('rejects partial R2 settings', () => {
    expect(() => validateRuntimeConfiguration({
      ...validConfiguration,
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    })).toThrow('All R2 settings must be configured together');
  });

  it('accepts complete HTTPS R2 settings', () => {
    expect(() => validateRuntimeConfiguration({
      ...validConfiguration,
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'lumenrise-profiles',
      R2_PUBLIC_BASE_URL: 'https://images.lumenrise.app',
    })).not.toThrow();
  });

  it('rejects the S3 API endpoint as the public image URL', () => {
    expect(() => validateRuntimeConfiguration({
      ...validConfiguration,
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'lumenrise-profiles',
      R2_PUBLIC_BASE_URL: 'https://account.r2.cloudflarestorage.com/lumenrise-profiles',
    })).toThrow('public image domain');
  });

  it('requires HTTPS URLs in production', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, NODE_ENV: 'production' }),
    ).toThrow('must use HTTPS in production');
  });

  it('requires a durable JWT signing secret in production', () => {
    expect(() =>
      validateRuntimeConfiguration({
        ...validConfiguration,
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: '',
      }),
    ).toThrow('AUTH_JWT_SECRET');
  });
});
