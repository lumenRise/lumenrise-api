import type { StellarOperationsResult } from '../../types/stellar/operations.js';
import type {
  StellarActivityAggregate,
  StellarActivityMergeResult,
} from '../../types/stellar/scan.js';
import { createEmptyStellarActivityAggregate } from '../../utils/services/stellar/mergeActivityPage/createEmptyStellarActivityAggregate.js';

const mergeStellarActivityPage = (
  current: StellarActivityAggregate,
  page: StellarOperationsResult,
  lastDay: string | null,
  lastTransactionHash: string | null,
): StellarActivityMergeResult => {
  if (page.order !== 'desc') {
    throw new Error('Stellar activity scans require descending operations');
  }

  const firstOperation = page.items[0];
  const lastOperation = page.items.at(-1);

  const firstDay = firstOperation
    ? new Date(firstOperation.createdAt).toISOString().slice(0, 10)
    : null;

  const nextLastDay = lastOperation
    ? new Date(lastOperation.createdAt).toISOString().slice(0, 10)
    : lastDay;

  const operationTypeCounts = new Map(Object.entries(current.operationTypeCounts));

  for (const [type, count] of Object.entries(page.summary.operationTypeCounts)) {
    operationTypeCounts.set(type, (operationTypeCounts.get(type) ?? 0) + count);
  }

  return {
    summary: {
      scope: 'scanned_pages',
      operationCount: current.operationCount + page.summary.operationCount,
      initiatedOperationCount:
        current.initiatedOperationCount + page.summary.initiatedOperationCount,
      relatedOperationCount: current.relatedOperationCount + page.summary.relatedOperationCount,
      distinctTransactionCount:
        current.distinctTransactionCount +
        page.summary.distinctTransactionCount -
        (firstOperation && firstOperation.transactionHash === lastTransactionHash ? 1 : 0),
      activeDayCount:
        current.activeDayCount +
        page.summary.activeDayCount -
        (firstDay && firstDay === lastDay ? 1 : 0),
      firstObservedAt:
        !current.firstObservedAt ||
        (page.summary.firstObservedAt && page.summary.firstObservedAt < current.firstObservedAt)
          ? page.summary.firstObservedAt
          : current.firstObservedAt,
      lastObservedAt:
        !current.lastObservedAt ||
        (page.summary.lastObservedAt && page.summary.lastObservedAt > current.lastObservedAt)
          ? page.summary.lastObservedAt
          : current.lastObservedAt,
      operationTypeCounts: Object.fromEntries(operationTypeCounts),
      sentPaymentCount: current.sentPaymentCount + page.summary.sentPaymentCount,
      receivedPaymentCount: current.receivedPaymentCount + page.summary.receivedPaymentCount,
      selfPaymentCount: current.selfPaymentCount + page.summary.selfPaymentCount,
      trustlineChangeCount: current.trustlineChangeCount + page.summary.trustlineChangeCount,
      offerActionCount: current.offerActionCount + page.summary.offerActionCount,
      contractInvocationCount:
        current.contractInvocationCount + page.summary.contractInvocationCount,
    },
    lastDay: nextLastDay,
    lastTransactionHash: lastOperation?.transactionHash ?? lastTransactionHash,
  };
};

export { createEmptyStellarActivityAggregate, mergeStellarActivityPage };
