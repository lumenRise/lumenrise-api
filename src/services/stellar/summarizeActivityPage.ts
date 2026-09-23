import type { StellarOperationResult } from '../../types/stellar/operations.js';
import type { StellarActivityPageSummary } from '../../types/stellar/activity.js';

const STELLAR_OFFER_OPERATION_TYPES = new Set([
  'manage_sell_offer',
  'manage_buy_offer',
  'create_passive_sell_offer',
]);
const summarizeStellarActivityPage = (
  address: string,
  operations: StellarOperationResult[],
): StellarActivityPageSummary => {
  const transactionHashes = new Set<string>();
  const activeDays = new Set<string>();
  const operationTypeCounts = new Map<string, number>();

  let initiatedOperationCount = 0;
  let sentPaymentCount = 0;
  let receivedPaymentCount = 0;
  let selfPaymentCount = 0;
  let trustlineChangeCount = 0;
  let offerActionCount = 0;
  let contractInvocationCount = 0;
  let firstObservedAt: string | null = null;
  let lastObservedAt: string | null = null;

  for (const operation of operations) {
    const observedAt = new Date(operation.createdAt);

    if (Number.isNaN(observedAt.getTime())) {
      throw new Error('Stellar operation has an invalid timestamp');
    }

    const observedAtIso = observedAt.toISOString();

    transactionHashes.add(operation.transactionHash);
    activeDays.add(observedAtIso.slice(0, 10));
    operationTypeCounts.set(operation.type, (operationTypeCounts.get(operation.type) ?? 0) + 1);

    if (operation.sourceAccount === address) {
      initiatedOperationCount += 1;
    }

    if (!firstObservedAt || observedAtIso < firstObservedAt) {
      firstObservedAt = observedAtIso;
    }

    if (!lastObservedAt || observedAtIso > lastObservedAt) {
      lastObservedAt = observedAtIso;
    }

    if (operation.type === 'payment') {
      const from = operation.details.from;
      const to = operation.details.to;

      if (from === address && to === address) {
        selfPaymentCount += 1;
      } else if (from === address) {
        sentPaymentCount += 1;
      } else if (to === address) {
        receivedPaymentCount += 1;
      }
    }

    if (operation.type === 'change_trust') {
      trustlineChangeCount += 1;
    }

    if (STELLAR_OFFER_OPERATION_TYPES.has(operation.type)) {
      offerActionCount += 1;
    }

    if (operation.type === 'invoke_host_function') {
      contractInvocationCount += 1;
    }
  }

  return {
    scope: 'page',
    operationCount: operations.length,
    initiatedOperationCount,
    relatedOperationCount: operations.length - initiatedOperationCount,
    distinctTransactionCount: transactionHashes.size,
    activeDayCount: activeDays.size,
    firstObservedAt,
    lastObservedAt,
    operationTypeCounts: Object.fromEntries(operationTypeCounts),
    sentPaymentCount,
    receivedPaymentCount,
    selfPaymentCount,
    trustlineChangeCount,
    offerActionCount,
    contractInvocationCount,
  };
};

export default summarizeStellarActivityPage;
