import { describe, expect, it } from 'vitest';

import summarizeStellarActivityPage from '../../src/services/stellar/summarizeActivityPage.js';
import type {
  StellarOperationResult,
  StellarOperationsResult,
} from '../../src/types/stellar/operations.js';
import {
  createEmptyStellarActivityAggregate,
  mergeStellarActivityPage,
} from '../../src/services/stellar/mergeActivityPage.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const createOperation = (
  pagingToken: string,
  transactionHash: string,
  createdAt: string,
): StellarOperationResult => ({
  pagingToken,
  transactionHash,
  createdAt,
  type: 'payment',
  typeId: 1,
  sourceAccount: address,
  details: {},
});
const createPage = (
  items: StellarOperationResult[],
  nextCursor: string | null,
): StellarOperationsResult => ({
  address,
  ownershipVerified: false,
  order: 'desc',
  limit: 2,
  items,
  summary: summarizeStellarActivityPage(address, items),
  nextCursor,
});

describe('Stellar activity scan aggregation', () => {
  it('deduplicates transaction and UTC day at a page boundary', () => {
    const first = createPage(
      [
        createOperation('3', 'a', '2026-09-24T12:00:00Z'),
        createOperation('2', 'b', '2026-09-23T12:00:00Z'),
      ],
      '2',
    );
    const second = createPage(
      [
        createOperation('1', 'b', '2026-09-23T12:00:00Z'),
        createOperation('0', 'c', '2026-09-22T12:00:00Z'),
      ],
      null,
    );
    const one = mergeStellarActivityPage(createEmptyStellarActivityAggregate(), first, null, null);
    const two = mergeStellarActivityPage(one.summary, second, one.lastDay, one.lastTransactionHash);

    expect(two.summary).toMatchObject({
      scope: 'scanned_pages',
      operationCount: 4,
      distinctTransactionCount: 3,
      activeDayCount: 3,
      operationTypeCounts: { payment: 4 },
      firstObservedAt: '2026-09-22T12:00:00.000Z',
      lastObservedAt: '2026-09-24T12:00:00.000Z',
    });
    expect(two.lastTransactionHash).toBe('c');
    expect(two.lastDay).toBe('2026-09-22');
  });

  it('retains the aggregate when the final page is empty', () => {
    const current = createEmptyStellarActivityAggregate();
    const result = mergeStellarActivityPage(current, createPage([], null), null, null);

    expect(result.summary).toEqual(current);
    expect(result.lastDay).toBeNull();
    expect(result.lastTransactionHash).toBeNull();
  });

  it('rejects ascending pages in a descending scan', () => {
    const page = createPage([], null);

    page.order = 'asc';

    expect(() =>
      mergeStellarActivityPage(createEmptyStellarActivityAggregate(), page, null, null),
    ).toThrow('descending');
  });
});
