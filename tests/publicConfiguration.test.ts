import request from 'supertest';
import { Networks } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import env from '../src/env';
import Launch from '../src/models/Launch';
import createOpenApiValidator from './helpers/createOpenApiValidator';

vi.mock('../src/env', () => ({
  default: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    CLIENT_ORIGIN: 'https://interface.example',
    AUTH_PROVIDER_API_URL: 'https://private-auth.example',
    AUTH_PROVIDER_APP_ID: 'public-app-id',
    AUTH_PROVIDER_APP_SECRET: 'secret-auth-value',
    GITHUB_CLIENT_ID: 'private-github-client',
    GITHUB_CLIENT_SECRET: 'secret-github-value',
    GITHUB_CALLBACK_URL: 'https://private-callback.example/github',
    X_CLIENT_ID: 'private-x-client',
    X_CLIENT_SECRET: 'secret-x-value',
    X_CALLBACK_URL: 'https://private-callback.example/x',
    DB_URI: 'mongodb://private-database.example',
    DB_NAME: 'private-database-name',
    RABBITMQ_URL: 'amqp://private-queue.example',
    CREDENTIAL_ENCRYPTION_KEY: 'secret-encryption-value',
    R2_ENDPOINT: 'https://private-storage.example',
    R2_ACCESS_KEY_ID: 'secret-storage-id',
    R2_SECRET_ACCESS_KEY: 'secret-storage-value',
    R2_BUCKET_NAME: 'private-bucket-name',
    R2_PUBLIC_BASE_URL: 'https://images.example',
    R2_MAX_AVATAR_BYTES: 2_000_000,
    R2_MAX_TOKEN_IMAGE_BYTES: 3_000_000,
    STELLAR_TESTNET_RPC_URL: 'https://rpc-testnet.example',
    STELLAR_TESTNET_HORIZON_URL: 'https://horizon-testnet.example',
    STELLAR_TESTNET_HOME_DOMAIN: 'testnet.example',
    LAUNCH_TESTNET_FACTORY_CONTRACT_ID: 'testnet-factory',
    TESTNET_TOML: '/private/testnet.toml',
    STELLAR_PUBLIC_RPC_URL: 'https://rpc-public.example',
    STELLAR_PUBLIC_HORIZON_URL: 'https://horizon-public.example',
    STELLAR_PUBLIC_HOME_DOMAIN: 'public.example',
    LAUNCH_PUBLIC_FACTORY_CONTRACT_ID: 'public-factory',
    PUBLIC_TOML: '/private/public.toml',
    FUTURE_SECRET: 'secret-added-later',
  },
}));

const originalConfiguration = { ...env };

afterEach(() => {
  Object.assign(env, originalConfiguration);

  vi.restoreAllMocks();
});

describe('public application configuration', () => {
  it('returns both networks before login without calling upstream services', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch');
    const response = await request(app).get('/v1/config');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(upstream).not.toHaveBeenCalled();
    expect(response.body.result).toMatchObject({
      version: 1,
      auth: { appId: 'public-app-id' },
      network: {
        default: 'testnet',
        header: 'X-Stellar-Network',
        supported: ['testnet', 'public'],
        configurations: {
          testnet: {
            network: 'testnet',
            rpcUrl: 'https://rpc-testnet.example',
            horizonUrl: 'https://horizon-testnet.example',
            networkPassphrase: Networks.TESTNET,
            factoryContractId: 'testnet-factory',
            homeDomain: 'testnet.example',
            launchConfigured: true,
          },
          public: {
            network: 'public',
            rpcUrl: 'https://rpc-public.example',
            horizonUrl: 'https://horizon-public.example',
            networkPassphrase: Networks.PUBLIC,
            factoryContractId: 'public-factory',
            homeDomain: 'public.example',
            launchConfigured: true,
          },
        },
      },
      features: {
        registration: true,
        imageUploads: true,
        githubConnection: true,
        xConnection: true,
      },
      uploads: {
        avatar: { maxBytes: 2_000_000 },
        tokenImage: { maxBytes: 3_000_000 },
        teamImage: { maxBytes: 2_000_000 },
      },
      rules: {
        images: { minWidth: 128, minHeight: 128 },
        profile: { nameMaxLength: 80 },
        projectLinks: { maxLength: 2048, protocols: ['https:'] },
        launches: { defaultLimit: 20, maxLimit: 100 },
        refresh: { manualIntervalMs: 900_000, xSyncIntervalMs: 2_592_000_000 },
        chart: { maxLimit: 1000, timeframes: expect.arrayContaining(['1m', '1y']) },
        developerApiKeys: { maxActive: 10, ttlMs: 7_776_000_000 },
        policies: { minScore: 0, maxScore: 100, minAgeSeconds: 60 },
      },
    });
  });

  it('uses an explicit allowlist and satisfies the closed documented schema', async () => {
    const response = await request(app).get('/v1/config');
    const validate = createOpenApiValidator({ $ref: '#/components/schemas/PublicConfiguration' });

    expect(validate(response.body.result), JSON.stringify(validate.errors)).toBe(true);
    expect(Object.keys(response.body.result).sort()).toEqual([
      'auth',
      'features',
      'network',
      'rules',
      'uploads',
      'version',
    ]);

    for (const [key, value] of Object.entries(env)) {
      if (
        /SECRET|PRIVATE|DB_|RABBITMQ|CREDENTIAL|TOML|CALLBACK|R2_(ENDPOINT|ACCESS|BUCKET)/.test(key)
      ) {
        expect(response.text).not.toContain(key);
        expect(response.text).not.toContain(String(value));
      }
    }

    expect(response.body.result.network.configurations.testnet).not.toHaveProperty('tomlPath');
    expect(validate({ ...response.body.result, unexpectedSecret: 'secret' })).toBe(false);
  });

  it('reports missing optional configuration without disabling network reads', async () => {
    Object.assign(env, {
      STELLAR_PUBLIC_RPC_URL: '',
      LAUNCH_PUBLIC_FACTORY_CONTRACT_ID: '',
      AUTH_PROVIDER_APP_SECRET: '',
      GITHUB_CLIENT_SECRET: '',
      X_CLIENT_SECRET: '',
      R2_SECRET_ACCESS_KEY: '',
    });

    const response = await request(app).get('/v1/config').set('X-Stellar-Network', 'public');

    expect(response.status).toBe(200);
    expect(response.headers['x-stellar-network']).toBe('public');
    expect(response.body.result.network.default).toBe('testnet');
    expect(response.body.result.network.configurations.public).toMatchObject({
      launchConfigured: false,
      horizonUrl: 'https://horizon-public.example',
      rpcUrl: '',
      factoryContractId: '',
    });
    expect(response.body.result.features).toEqual({
      registration: false,
      imageUploads: false,
      githubConnection: false,
      xConnection: false,
    });
  });

  it('keeps the existing invalid network response', async () => {
    const response = await request(app).get('/v1/config').set('X-Stellar-Network', 'mainnet');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });

  it('publishes the same launch list limits enforced by the server', async () => {
    const aggregate = vi.spyOn(Launch, 'aggregate').mockResolvedValue([]);
    const configuration = await request(app).get('/v1/config');
    const rules = configuration.body.result.rules.launches;

    const valid = await request(app)
      .get('/v1/launches')
      .query({
        limit: rules.maxLimit,
        page: rules.maxPage,
        search: 'a'.repeat(rules.searchMaxLength),
      });

    expect(valid.status).toBe(200);
    expect(valid.body.result.limit).toBe(rules.maxLimit);
    expect(aggregate).toHaveBeenCalledOnce();

    for (const query of [
      { limit: rules.maxLimit + 1 },
      { limit: rules.minLimit - 1 },
      { page: rules.maxPage + 1 },
      { search: 'a'.repeat(rules.searchMaxLength + 1) },
    ]) {
      const invalid = await request(app).get('/v1/launches').query(query);

      expect(invalid.status).toBe(400);
    }

    expect(aggregate).toHaveBeenCalledOnce();
  });
});
