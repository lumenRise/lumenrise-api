import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair, Networks, rpc } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import createPage from '../utils/stellarActivityScan/createPage.js';
import StellarPaymentFact from '../../src/models/StellarPaymentFact.js';
import StellarActivityScan from '../../src/models/StellarActivityScan.js';
import createOperation from '../utils/stellarActivityScan/createOperation.js';
import type { StellarActivityScanDocument } from '../../src/types/stellar/scan.js';
import SorobanTransactionEvidence from '../../src/models/SorobanTransactionEvidence.js';
import { processSorobanEvidence } from '../../src/services/stellar/sorobanEvidenceWorker.js';
import persistStellarPaymentPage from '../../src/services/sybil/persistStellarPaymentPage.js';
import getSorobanEvidenceForPage from '../../src/services/stellar/getSorobanEvidenceForPage.js';
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
    await Promise.all([
      StellarActivityScan.createIndexes(),
      StellarPaymentFact.createIndexes(),
      SorobanTransactionEvidence.createIndexes(),
    ]);
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
    const invocation = {
      ...createOperation('6', 'contract-transaction', '2026-09-25T12:00:00Z'),
      type: 'invoke_host_function',
    };
    const page = createPage([operation, invocation], null);
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
    const candidates = getSorobanEvidenceForPage(scan as StellarActivityScanDocument, page);
    const write = vi
      .spyOn(SorobanTransactionEvidence, 'bulkWrite')
      .mockRejectedValueOnce(new Error('Simulated fact write failure'));

    await expect(
      persistStellarPaymentPage(scan as StellarActivityScanDocument, page, merged, now, candidates),
    ).rejects.toThrow('Simulated fact write failure');
    expect((await StellarActivityScan.findById(scan._id))?.pagesProcessed).toBe(0);
    expect(await StellarPaymentFact.countDocuments({ scan: scan._id })).toBe(0);
    expect(await SorobanTransactionEvidence.countDocuments({ scan: scan._id })).toBe(0);

    write.mockRestore();

    await persistStellarPaymentPage(
      scan as StellarActivityScanDocument,
      page,
      merged,
      now,
      candidates,
    );
    await persistStellarPaymentPage(
      scan as StellarActivityScanDocument,
      page,
      merged,
      now,
      candidates,
    );

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
    expect(await SorobanTransactionEvidence.countDocuments({ scan: scan._id })).toBe(1);
    expect(await SorobanTransactionEvidence.findOne({ scan: scan._id })).toMatchObject({
      transactionHash: 'contract-transaction',
      operationIds: ['6'],
      rpcStatus: 'queued',
    });

    const network = vi
      .spyOn(rpc.Server.prototype, 'getNetwork')
      .mockResolvedValue({ passphrase: Networks.TESTNET } as never);
    const transaction = vi.spyOn(rpc.Server.prototype, 'getTransaction').mockResolvedValue({
      status: 'SUCCESS',
      txHash: 'contract-transaction',
      ledger: 123,
      envelopeXdr: { toXdr: () => 'envelope-xdr' },
      resultMetaXdr: { toXdr: () => 'meta-xdr' },
      returnValue: { toXdr: () => 'return-xdr' },
      events: { contractEventsXdr: [] },
    } as never);

    try {
      await processSorobanEvidence();
      expect(await SorobanTransactionEvidence.findOne({ scan: scan._id })).toMatchObject({
        rpcStatus: 'success',
        ledger: 123,
        envelopeXdr: 'envelope-xdr',
        resultMetaXdr: 'meta-xdr',
        returnValueXdr: 'return-xdr',
      });
    } finally {
      network.mockRestore();
      transaction.mockRestore();
    }
  });
});
