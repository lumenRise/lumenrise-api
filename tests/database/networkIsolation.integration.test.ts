import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import env from '../../src/env';
import Identity from '../../src/models/Identity';
import StellarPaymentFact from '../../src/models/StellarPaymentFact';
import StellarActivityScan from '../../src/models/StellarActivityScan';
import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown';
import SorobanTransactionEvidence from '../../src/models/SorobanTransactionEvidence';
import stellarNetworkIsolation from '../../src/migrations/20261019StellarNetworkIsolation';

vi.mock('../../src/env', async (load) => {
  const original = await load<{ default: Record<string, unknown> }>();

  return { default: { ...original.default } };
});

vi.mock('../../src/services/integration/publishReputationJob', () => ({
  publishReputationJob: vi.fn(),
}));

const databaseName = `network_isolation_${randomUUID().replaceAll('-', '')}`;
const address = Keypair.random().publicKey();

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('MongoDB network isolation', () => {
  beforeAll(async () => {
    mongoose.set('autoIndex', false);

    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: databaseName });
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    env.STELLAR_LEGACY_NETWORK = undefined;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('backfills both networks from Horizon and propagates network to linked evidence', async () => {
    const identity = new mongoose.Types.ObjectId();
    const testnetScan = new mongoose.Types.ObjectId();
    const publicScan = new mongoose.Types.ObjectId();

    await StellarActivityScan.collection.insertMany([
      {
        _id: testnetScan,
        identity,
        address,
        sourceUrl: 'https://horizon-testnet.stellar.org',
        active: false,
      },
      {
        _id: publicScan,
        identity,
        address,
        sourceUrl: 'https://horizon.stellar.org',
        active: false,
      },
    ] as never);

    await StellarActivityScan.collection.createIndex(
      { identity: 1, active: 1 },
      {
        name: 'stellar_activity_one_active_per_identity',
        unique: true,
        partialFilterExpression: { active: true },
      },
    );

    await StellarPaymentFact.collection.insertMany([
      { scan: testnetScan, operationId: '1' },
      { scan: publicScan, operationId: '1' },
    ] as never);

    await SorobanTransactionEvidence.collection.insertMany([
      { scan: testnetScan, transactionHash: 'same-hash' },
      { scan: publicScan, transactionHash: 'same-hash' },
    ] as never);

    await stellarNetworkIsolation.up();
    await stellarNetworkIsolation.up();

    expect(await StellarActivityScan.countDocuments({ network: 'testnet' })).toBe(1);
    expect(await StellarActivityScan.countDocuments({ network: 'public' })).toBe(1);
    expect(await StellarPaymentFact.countDocuments({ network: 'testnet' })).toBe(1);
    expect(await StellarPaymentFact.countDocuments({ network: 'public' })).toBe(1);
    expect(await SorobanTransactionEvidence.countDocuments({ network: 'testnet' })).toBe(1);
    expect(await SorobanTransactionEvidence.countDocuments({ network: 'public' })).toBe(1);
    expect(
      (await StellarActivityScan.collection.indexes()).map((index) => index.name),
    ).not.toContain('stellar_activity_one_active_per_identity');
  });

  it('rejects unknown legacy sources before modifying scans', async () => {
    await StellarActivityScan.collection.insertOne({
      sourceUrl: 'https://unknown.example',
    } as never);

    await expect(stellarNetworkIsolation.up()).rejects.toThrow('STELLAR_LEGACY_NETWORK');

    expect(await StellarActivityScan.countDocuments({ network: { $exists: true } })).toBe(0);

    env.STELLAR_LEGACY_NETWORK = 'testnet';

    await stellarNetworkIsolation.up();

    expect(await StellarActivityScan.countDocuments({ network: 'testnet' })).toBe(1);
  });

  it('keeps active scans, results and refresh cooldowns separate for the same wallet', async () => {
    await stellarNetworkIsolation.up();
    await Identity.createIndexes();
    await ManualRefreshCooldown.createIndexes();
    await Identity.create({ externalUserId: '42', status: 'active' });

    const [testnet, publicNetwork] = await Promise.all([
      request(app).post(`/v1/stellar/accounts/${address}/activity-scan`).set('X-User-Id', '42'),
      request(app)
        .post(`/v1/stellar/accounts/${address}/activity-scan`)
        .set('X-User-Id', '42')
        .set('X-Stellar-Network', 'public'),
    ]);

    expect(testnet.status).toBe(202);
    expect(publicNetwork.status).toBe(202);
    expect(testnet.body.result.network).toBe('testnet');
    expect(publicNetwork.body.result.network).toBe('public');
    expect(testnet.body.result.id).not.toBe(publicNetwork.body.result.id);
    expect(await StellarActivityScan.countDocuments({ active: true })).toBe(2);
    expect(await ManualRefreshCooldown.countDocuments()).toBe(2);

    for (const network of ['testnet', 'public']) {
      const response = await request(app)
        .get(`/v1/stellar/accounts/${address}/activity-scan`)
        .set('X-User-Id', '42')
        .set('X-Stellar-Network', network);

      expect(response.status).toBe(200);
      expect(response.body.result.network).toBe(network);

      const repeated = await request(app)
        .post(`/v1/stellar/accounts/${address}/activity-scan`)
        .set('X-User-Id', '42')
        .set('X-Stellar-Network', network);

      expect(repeated.status).toBe(429);
    }
  });
});
