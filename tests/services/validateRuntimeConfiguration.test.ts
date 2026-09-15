import { describe, expect, it } from 'vitest';

import type { RuntimeConfiguration } from '../../src/types/configuration.js';
import validateRuntimeConfiguration from '../../src/services/configuration/validateRuntimeConfiguration.js';

const validConfiguration: RuntimeConfiguration = {
  NODE_ENV: 'development',
  CLIENT_ORIGIN: 'http://localhost:5173',
  GITHUB_CLIENT_ID: 'github-client-id',
  GITHUB_CLIENT_SECRET: 'github-client-secret',
  GITHUB_CALLBACK_URL: 'http://localhost:5000/v1/oauth/github/callback',
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

  it('rejects an invalid credential encryption key', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, CREDENTIAL_ENCRYPTION_KEY: 'short' }),
    ).toThrow('64-character hexadecimal key');
  });

  it('requires HTTPS URLs in production', () => {
    expect(() =>
      validateRuntimeConfiguration({ ...validConfiguration, NODE_ENV: 'production' }),
    ).toThrow('must use HTTPS in production');
  });
});
