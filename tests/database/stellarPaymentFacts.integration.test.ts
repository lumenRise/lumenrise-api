import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import createPage from '../utils/stellarActivityScan/createPage.js';
import StellarPaymentFact from '../../src/models/StellarPaymentFact.js';
import StellarActivityScan from '../../src/models/StellarActivityScan.js';
import createOperation from '../utils/stellarActivityScan/createOperation.js';
import type { StellarActivityScanDocument } from '../../src/types/stellar/scan.js';
import persistStellarPaymentPage from '../../src/services/sybil/persistStellarPaymentPage.js';
import {
  createEmptyStellarActivityAggregate,
  mergeStellarActivityPage,
} from '../../src/services/stellar/mergeActivityPage.js';

const databaseName = `lumenrise_payment_test_${randomUUID().replaceAll('-', '')}`;
const address = Keypair.random().publicKey();
const counterparty = Keypair.random().publicKey();

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('MongoDB Stellar payment facts', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5_000,
    });
    await Promise.all([StellarActivityScan.createIndexes(), StellarPaymentFact.createIndexes()]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  it('commits facts with the scan checkpoint, rejects stale writes and rolls back failures', async () => {
    const operation = {
      ...createOperation('5', 'transaction', '2026-09-25T12:00:00Z'),
      details: { from: address, to: counterparty },
    };
    const page = createPage([operation], null);
    const leaseUntil = new Date(Date.now() + 60_000);
    const scan = await StellarActivityScan.create({
      identity: new mongoose.Types.ObjectId(),
      address,
      sourceUrl: 'https://horizon-testnet.stellar.org',
      status: 'running',
      active: true,
      leaseUntil,
      cursor: null,
      summary: createEmptyStellarActivityAggregate(),
      scheduledAt: new Date(),
    });
    const merged = mergeStellarActivityPage(scan.summary, page, null, null);
    const now = new Date();
    const write = vi
      .spyOn(StellarPaymentFact, 'bulkWrite')
      .mockRejectedValueOnce(new Error('Simulated fact write failure'));

    await expect(
      persistStellarPaymentPage(scan as StellarActivityScanDocument, page, merged, now),
    ).rejects.toThrow('Simulated fact write failure');
    expect((await StellarActivityScan.findById(scan._id))?.pagesProcessed).toBe(0);
    expect(await StellarPaymentFact.countDocuments({ scan: scan._id })).toBe(0);

    write.mockRestore();

    await persistStellarPaymentPage(scan as StellarActivityScanDocument, page, merged, now);
    await persistStellarPaymentPage(scan as StellarActivityScanDocument, page, merged, now);

    expect((await StellarActivityScan.findById(scan._id))?.status).toBe('completed');
    expect((await StellarActivityScan.findById(scan._id))?.pagesProcessed).toBe(1);
    const facts = await StellarPaymentFact.find({ scan: scan._id });

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      address,
      counterparty,
      direction: 'outgoing',
      operationId: '5',
      requestedByIdentity: scan.identity,
    });
  });
});
