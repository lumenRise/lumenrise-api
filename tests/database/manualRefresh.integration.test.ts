import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Policy from '../../src/models/Policy';
import Identity from '../../src/models/Identity';
import StellarAccount from '../../src/models/StellarAccount';
import ExternalAccount from '../../src/models/ExternalAccount';
import IntegrationSyncJob from '../../src/models/IntegrationSyncJob';
import StellarActivityScan from '../../src/models/StellarActivityScan';
import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown';
import reserveManualRefresh from '../../src/services/refresh/reserveManualRefresh';
import releaseManualRefresh from '../../src/services/refresh/releaseManualRefresh';

const databaseName = `lumenrise_integration_${randomUUID().replaceAll('-', '')}`;
const wallet = Keypair.random();
const userId = '42';

vi.mock('../../src/env', async (original) => {
  const module = await original<{ default: Record<string, unknown> }>();
  return {
    default: {
      ...module.default,
      AUTH_PROVIDER_API_URL: 'https://identity.example',
      AUTH_PROVIDER_APP_ID: 'app-id',
      AUTH_PROVIDER_APP_SECRET: 'app-secret',
    },
  };
});
vi.mock('../../src/services/auth/provider', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  getVerifiedProviderAddresses: vi.fn(async () => [wallet.publicKey()]),
}));
let identityId: string;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('MongoDB manual refresh flows', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5_000,
    });
    await Promise.all([
      Policy.createIndexes(),
      Identity.createIndexes(),
      StellarAccount.createIndexes(),
      ExternalAccount.createIndexes(),
      IntegrationSyncJob.createIndexes(),
      StellarActivityScan.createIndexes(),
      ManualRefreshCooldown.createIndexes(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  it('registers verified Auth provider wallets and identifies subsequent requests by user ID', async () => {
    const registered = await request(app).post('/v1/auth/register').send({
      userId,
      name: 'Integration Test',
    });
    expect(registered.status, registered.body.message).toBe(200);
    identityId = registered.body.result.identityId;

    const session = await request(app).get('/v1/auth/session').set('X-User-Id', userId);

    expect(session.status).toBe(200);
  });

  it('queues one manual provider sync and limits the next request', async () => {
    await ExternalAccount.create({
      identity: identityId,
      provider: 'github',
      providerAccountId: 'integration-test',
      username: 'integration-test',
      connectedAt: new Date(),
    });

    const first = await request(app).post('/v1/connections/github/sync').set('X-User-Id', userId);
    const second = await request(app).post('/v1/connections/github/sync').set('X-User-Id', userId);

    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
    expect(await IntegrationSyncJob.countDocuments({ identity: identityId })).toBe(1);
  });

  it('does not consume the scan cooldown when an active scan conflicts', async () => {
    const otherAddress = Keypair.random().publicKey();

    await StellarActivityScan.create({
      identity: identityId,
      address: wallet.publicKey(),
      sourceUrl: 'https://horizon-testnet.stellar.org',
      status: 'queued',
      active: true,
      scheduledAt: new Date(),
    });

    const conflict = await request(app)
      .post(`/v1/stellar/accounts/${otherAddress}/activity-scan`)
      .set('X-User-Id', userId);

    expect(conflict.status).toBe(409);
    expect(
      await ManualRefreshCooldown.countDocuments({
        identity: identityId,
        target: 'stellar-activity-scan',
      }),
    ).toBe(0);

    const accepted = await request(app)
      .post(`/v1/stellar/accounts/${wallet.publicKey()}/activity-scan`)
      .set('X-User-Id', userId);

    expect(accepted.status).toBe(202);
  });

  it('creates and evaluates a policy from stored evidence with a cooldown', async () => {
    const created = await request(app)
      .post('/v1/policies')
      .set('X-User-Id', userId)
      .send({
        key: 'developer-minimum',
        version: 1,
        match: 'all',
        rules: [{ dimension: 'developer', minScore: 50, maxAgeSeconds: 86_400 }],
      });

    expect(created.status).toBe(201);

    const first = await request(app)
      .post('/v1/policies/developer-minimum/evaluate')
      .set('X-User-Id', userId);
    const second = await request(app)
      .post('/v1/policies/developer-minimum/evaluate')
      .set('X-User-Id', userId);

    expect(first.status).toBe(200);
    expect(first.body.result.decision).toBe('insufficient_data');
    expect(second.status).toBe(429);
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('reports linked evidence without claiming a Sybil verdict', async () => {
    const response = await request(app)
      .get('/v1/reputation/sybil/evidence')
      .set('X-User-Id', userId);

    expect(response.status).toBe(200);
    expect(response.body.result.assessment).toBe('not_assessed');
    expect(response.body.result.observations).toMatchObject([
      { source: 'stellar', ownership: 'wallet_registration' },
      { source: 'github', ownership: 'oauth_connection', coverage: 'missing' },
    ]);
    expect(response.body.result).not.toHaveProperty('score');
  });

  it('allows only one concurrent reservation and does not release its successor', async () => {
    const identity = new mongoose.Types.ObjectId(identityId);
    const target = 'concurrent-integration-test';
    const now = new Date();
    const [first, second] = await Promise.all([
      reserveManualRefresh(identity, target, now),
      reserveManualRefresh(identity, target, now),
    ]);
    const winner = first.allowed ? first : second;

    expect([first.allowed, second.allowed].filter(Boolean)).toHaveLength(1);
    expect(winner.reservedUntil).toBeInstanceOf(Date);

    await releaseManualRefresh(identity, target, winner.reservedUntil!);
    const successor = await reserveManualRefresh(identity, target, new Date(now.getTime() + 1_000));

    expect(successor.allowed).toBe(true);
    await releaseManualRefresh(identity, target, winner.reservedUntil!);
    expect(await ManualRefreshCooldown.countDocuments({ identity, target })).toBe(1);
  });
});
