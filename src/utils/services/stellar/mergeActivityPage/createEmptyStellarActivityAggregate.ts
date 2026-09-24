import type { StellarActivityAggregate } from '../../../../types/stellar/scan.js';

const createEmptyStellarActivityAggregate = (): StellarActivityAggregate => ({
  scope: 'scanned_pages',
  operationCount: 0,
  initiatedOperationCount: 0,
  relatedOperationCount: 0,
  distinctTransactionCount: 0,
  activeDayCount: 0,
  firstObservedAt: null,
  lastObservedAt: null,
  operationTypeCounts: {},
  sentPaymentCount: 0,
  receivedPaymentCount: 0,
  selfPaymentCount: 0,
  trustlineChangeCount: 0,
  offerActionCount: 0,
  contractInvocationCount: 0,
});

export { createEmptyStellarActivityAggregate };
