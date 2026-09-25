import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import createPage from '../utils/stellarActivityScan/createPage.js';
import createOperation from '../utils/stellarActivityScan/createOperation.js';
import type { StellarActivityScanDocument } from '../../src/types/stellar/scan.js';
import getSorobanEvidenceForPage from '../../src/services/stellar/getSorobanEvidenceForPage.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Soroban evidence candidates', () => {
  it('deduplicates invocations per transaction without assuming account ownership or project identity', () => {
    const scan = {
      _id: new Types.ObjectId(),
      identity: new Types.ObjectId(),
      address,
      sourceUrl: 'https://horizon-testnet.stellar.org',
    } as StellarActivityScanDocument;
    const other = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const first = {
      ...createOperation('1', 'abc', '2026-09-25T12:00:00Z'),
      type: 'invoke_host_function',
      transactionHash: 'abc',
      sourceAccount: other,
    };
    const second = {
      ...createOperation('2', 'abc', '2026-09-25T12:00:00Z'),
      type: 'invoke_host_function',
      transactionHash: 'abc',
      sourceAccount: address,
    };
    const page = createPage(
      [first, second, createOperation('3', 'payment', '2026-09-25T12:00:00Z')],
      null,
    );

    const result = getSorobanEvidenceForPage(scan, page);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      scan: scan._id,
      address,
      transactionHash: 'abc',
      operationIds: ['1', '2'],
      initiatedOperation: true,
      rpcStatus: 'queued',
      attempts: 0,
      events: [],
    });
    expect(getSorobanEvidenceForPage(scan, createPage([], null))).toEqual([]);
  });
});
