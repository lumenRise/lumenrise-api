import type { StellarActivityScanDocument } from '../../types/stellar/scan.js';
import type { StellarOperationsResult } from '../../types/stellar/operations.js';
import type { SorobanTransactionEvidenceInput } from '../../types/stellar/soroban.js';

const getSorobanEvidenceForPage = (
  scan: StellarActivityScanDocument,
  page: StellarOperationsResult,
): SorobanTransactionEvidenceInput[] => {
  const invocations = new Map<
    string,
    { operationIds: string[]; initiatedOperation: boolean; observedAt: Date }
  >();

  for (const operation of page.items) {
    if (operation.type !== 'invoke_host_function') {
      continue;
    }

    const existing = invocations.get(operation.transactionHash);
    if (existing) {
      existing.operationIds.push(operation.pagingToken);
      existing.initiatedOperation ||= operation.sourceAccount === scan.address;
    } else {
      invocations.set(operation.transactionHash, {
        operationIds: [operation.pagingToken],
        initiatedOperation: operation.sourceAccount === scan.address,
        observedAt: new Date(operation.createdAt),
      });
    }
  }

  return [...invocations].map(([transactionHash, invocation]) => ({
    scan: scan._id,
    requestedByIdentity: scan.identity,
    address: scan.address,
    sourceUrl: scan.sourceUrl,
    transactionHash,
    operationIds: invocation.operationIds,
    initiatedOperation: invocation.initiatedOperation,
    observedAt: invocation.observedAt,
    rpcStatus: 'queued',
    attempts: 0,
    scheduledAt: new Date(),
    leaseUntil: null,
    ledger: null,
    envelopeXdr: null,
    resultMetaXdr: null,
    returnValueXdr: null,
    events: [],
  }));
};

export default getSorobanEvidenceForPage;
