import { describe, expect, it } from 'vitest';

import type { StellarOperationResult } from '../../src/types/stellar/operations.js';
import summarizeStellarActivityPage from '../../src/services/stellar/summarizeActivityPage.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const otherAddress = 'GAYOLLLUIZE4DZMBB2ZBKGBUBZLIOYU6XFLW37GBP2VZD3ABNXCW4BVA';
const createOperation = (
  type: string,
  overrides: Partial<StellarOperationResult> = {},
): StellarOperationResult => ({
  pagingToken: '100',
  type,
  typeId: 1,
  createdAt: '2026-09-23T12:00:00Z',
  transactionHash: 'a'.repeat(64),
  sourceAccount: address,
  details: {},
  ...overrides,
});

describe('Stellar activity page summary', () => {
  it('separates initiated operations from related operations and payment directions', () => {
    const operations = [
      createOperation('payment', { details: { from: address, to: otherAddress } }),
      createOperation('payment', {
        sourceAccount: otherAddress,
        transactionHash: 'b'.repeat(64),
        details: { from: otherAddress, to: address },
      }),
      createOperation('payment', {
        transactionHash: 'c'.repeat(64),
        details: { from: address, to: address },
      }),
      createOperation('change_trust', {
        createdAt: '2026-09-22T08:00:00Z',
        transactionHash: 'd'.repeat(64),
      }),
      createOperation('manage_buy_offer', { transactionHash: 'e'.repeat(64) }),
      createOperation('invoke_host_function', {
        sourceAccount: otherAddress,
        transactionHash: 'e'.repeat(64),
      }),
    ];
    const summary = summarizeStellarActivityPage(address, operations);

    expect(summary).toEqual({
      scope: 'page',
      operationCount: 6,
      initiatedOperationCount: 4,
      relatedOperationCount: 2,
      distinctTransactionCount: 5,
      activeDayCount: 2,
      firstObservedAt: '2026-09-22T08:00:00.000Z',
      lastObservedAt: '2026-09-23T12:00:00.000Z',
      operationTypeCounts: {
        payment: 3,
        change_trust: 1,
        manage_buy_offer: 1,
        invoke_host_function: 1,
      },
      sentPaymentCount: 1,
      receivedPaymentCount: 1,
      selfPaymentCount: 1,
      trustlineChangeCount: 1,
      offerActionCount: 1,
      contractInvocationCount: 1,
    });
  });

  it('returns an empty page summary without implying complete account history', () => {
    expect(summarizeStellarActivityPage(address, [])).toMatchObject({
      scope: 'page',
      operationCount: 0,
      activeDayCount: 0,
      firstObservedAt: null,
      lastObservedAt: null,
    });
  });

  it('rejects an operation with an invalid timestamp', () => {
    expect(() =>
      summarizeStellarActivityPage(address, [
        createOperation('payment', { createdAt: 'not-a-date' }),
      ]),
    ).toThrow('invalid timestamp');
  });
});
