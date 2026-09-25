import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StellarActivityScanDocument } from '../../src/types/stellar/scan.js';
import type { StellarOperationsResult } from '../../src/types/stellar/operations.js';
import { failStellarActivityScan } from '../../src/services/stellar/activityScanQueue.js';
import getStellarAccountOperations from '../../src/services/stellar/getAccountOperations.js';
import persistStellarPaymentPage from '../../src/services/sybil/persistStellarPaymentPage.js';
import { processStellarActivityScan } from '../../src/services/stellar/activityScanWorker.js';

vi.mock('../../src/services/stellar/getAccountOperations.js', () => ({ default: vi.fn() }));
vi.mock('../../src/services/sybil/persistStellarPaymentPage.js', () => ({ default: vi.fn() }));
vi.mock('../../src/services/stellar/activityScanQueue.js', () => ({
  failStellarActivityScan: vi.fn(),
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const createScan = (): StellarActivityScanDocument =>
  ({
    _id: new Types.ObjectId(),
    address,
    cursor: '100',
    sourceUrl: 'https://horizon-testnet.stellar.org',
    leaseUntil: new Date('2026-09-24T00:00:30Z'),
    pagesProcessed: 1,
    consecutiveFailures: 0,
    lastDay: '2026-09-23',
    lastTransactionHash: 'a',
    summary: {
      scope: 'scanned_pages',
      operationCount: 1,
      initiatedOperationCount: 1,
      relatedOperationCount: 0,
      distinctTransactionCount: 1,
      activeDayCount: 1,
      firstObservedAt: '2026-09-23T12:00:00.000Z',
      lastObservedAt: '2026-09-23T12:00:00.000Z',
      operationTypeCounts: { payment: 1 },
      sentPaymentCount: 0,
      receivedPaymentCount: 0,
      selfPaymentCount: 0,
      trustlineChangeCount: 0,
      offerActionCount: 0,
      contractInvocationCount: 0,
    },
  }) as StellarActivityScanDocument;
const page: StellarOperationsResult = {
  address,
  ownershipVerified: false,
  order: 'desc',
  limit: 200,
  items: [
    {
      pagingToken: '99',
      type: 'payment',
      typeId: 1,
      createdAt: '2026-09-23T11:00:00Z',
      transactionHash: 'a',
      sourceAccount: address,
      details: {},
    },
  ],
  summary: {
    scope: 'page',
    operationCount: 1,
    initiatedOperationCount: 1,
    relatedOperationCount: 0,
    distinctTransactionCount: 1,
    activeDayCount: 1,
    firstObservedAt: '2026-09-23T11:00:00.000Z',
    lastObservedAt: '2026-09-23T11:00:00.000Z',
    operationTypeCounts: { payment: 1 },
    sentPaymentCount: 0,
    receivedPaymentCount: 0,
    selfPaymentCount: 0,
    trustlineChangeCount: 0,
    offerActionCount: 0,
    contractInvocationCount: 0,
  },
  nextCursor: null,
};

describe('Stellar activity scan worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the merged final page to the transactional persister', async () => {
    vi.mocked(getStellarAccountOperations).mockResolvedValue(page);
    const scan = createScan();

    await processStellarActivityScan(scan);

    expect(getStellarAccountOperations).toHaveBeenCalledWith(
      address,
      '100',
      200,
      'desc',
      scan.sourceUrl,
    );
    expect(persistStellarPaymentPage).toHaveBeenCalledWith(
      scan,
      page,
      expect.objectContaining({
        summary: expect.objectContaining({
          operationCount: 2,
          distinctTransactionCount: 1,
          activeDayCount: 1,
        }),
      }),
      expect.any(Date),
    );
  });

  it('does not advance the cursor on a transient Horizon failure', async () => {
    vi.mocked(getStellarAccountOperations).mockRejectedValue(new Error('Horizon unavailable'));
    const scan = createScan();

    await processStellarActivityScan(scan);

    expect(persistStellarPaymentPage).not.toHaveBeenCalled();
    expect(failStellarActivityScan).toHaveBeenCalledWith(scan, 'Horizon unavailable', true);
  });
});
