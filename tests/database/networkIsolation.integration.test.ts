import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Identity from '../../src/models/Identity';
import StellarPaymentFact from '../../src/models/StellarPaymentFact';
import StellarActivityScan from '../../src/models/StellarActivityScan';
import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown';
import SorobanTransactionEvidence from '../../src/models/SorobanTransactionEvidence';

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
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();

    await mongoose.disconnect();
  });

  it('keeps active scans, results and refresh cooldowns separate for the same wallet', async () => {
    await Promise.all([
      StellarActivityScan.createIndexes(),
      StellarPaymentFact.createIndexes(),
      SorobanTransactionEvidence.createIndexes(),
    ]);

    await Identity.createIndexes();

    await ManualRefreshCooldown.createIndexes();

    await Identity.create({ externalUserIds: ['42'], status: 'active' });

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
