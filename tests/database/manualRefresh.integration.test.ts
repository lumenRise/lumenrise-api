import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import Policy from '../../src/models/Policy.js';
import Session from '../../src/models/Session.js';
import Identity from '../../src/models/Identity.js';
import StellarAccount from '../../src/models/StellarAccount.js';
import ExternalAccount from '../../src/models/ExternalAccount.js';
import IntegrationSyncJob from '../../src/models/IntegrationSyncJob.js';
import StellarActivityScan from '../../src/models/StellarActivityScan.js';
import WalletAuthChallenge from '../../src/models/WalletAuthChallenge.js';
import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown.js';
import reserveManualRefresh from '../../src/services/refresh/reserveManualRefresh.js';
import releaseManualRefresh from '../../src/services/refresh/releaseManualRefresh.js';
import { hashWalletMessage } from '../../src/utils/services/auth/walletChallenge/hashWalletMessage.js';

const databaseName = `lumenrise_integration_${randomUUID().replaceAll('-', '')}`;
const wallet = Keypair.random();
let token: string;
let identityId: string;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('MongoDB manual refresh flows', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5_000,
    });
    await Promise.all([
      Policy.createIndexes(),
      Session.createIndexes(),
      Identity.createIndexes(),
      StellarAccount.createIndexes(),
      ExternalAccount.createIndexes(),
      IntegrationSyncJob.createIndexes(),
      StellarActivityScan.createIndexes(),
      ManualRefreshCooldown.createIndexes(),
      WalletAuthChallenge.createIndexes(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  it('registers a wallet with a signed message and accepts the resulting session', async () => {
    const challenge = await request(app).post('/v1/auth/wallet/challenge').send({
      address: wallet.publicKey(),
      purpose: 'register',
      name: 'Integration Test',
    });

    expect(challenge.status).toBe(201);

    const signature = Buffer.from(
      wallet.sign(hashWalletMessage(challenge.body.result.message)),
    ).toString('base64');
    const registered = await request(app).post('/v1/auth/wallet/register').send({
      address: wallet.publicKey(),
      name: 'Integration Test',
      challengeId: challenge.body.result.challengeId,
      signature,
    });

    expect(registered.status, registered.body.message).toBe(201);
    token = registered.body.result.accessToken;
    identityId = registered.body.result.identityId;

    const session = await request(app).get('/v1/auth/session').auth(token, { type: 'bearer' });

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

    const first = await request(app)
      .post('/v1/connections/github/sync')
      .auth(token, { type: 'bearer' });
    const second = await request(app)
      .post('/v1/connections/github/sync')
      .auth(token, { type: 'bearer' });

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
      .auth(token, { type: 'bearer' });

    expect(conflict.status).toBe(409);
    expect(
      await ManualRefreshCooldown.countDocuments({
        identity: identityId,
        target: 'stellar-activity-scan',
      }),
    ).toBe(0);

    const accepted = await request(app)
      .post(`/v1/stellar/accounts/${wallet.publicKey()}/activity-scan`)
      .auth(token, { type: 'bearer' });

    expect(accepted.status).toBe(202);
  });

  it('creates and evaluates a policy from stored evidence with a cooldown', async () => {
    const created = await request(app)
      .post('/v1/policies')
      .auth(token, { type: 'bearer' })
      .send({
        key: 'developer-minimum',
        version: 1,
        match: 'all',
        rules: [{ dimension: 'developer', minScore: 50, maxAgeSeconds: 86_400 }],
      });

    expect(created.status).toBe(201);

    const first = await request(app)
      .post('/v1/policies/developer-minimum/evaluate')
      .auth(token, { type: 'bearer' });
    const second = await request(app)
      .post('/v1/policies/developer-minimum/evaluate')
      .auth(token, { type: 'bearer' });

    expect(first.status).toBe(200);
    expect(first.body.result.decision).toBe('insufficient_data');
    expect(second.status).toBe(429);
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
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
