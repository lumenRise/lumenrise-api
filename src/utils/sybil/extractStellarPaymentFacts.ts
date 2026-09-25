import isValidStellarGAddress from '../stellar/isValidStellarGAddress.js';
import type { StellarPaymentFactRecord } from '../../types/sybil/network.js';
import type { StellarActivityScanDocument } from '../../types/stellar/scan.js';
import type { StellarOperationsResult } from '../../types/stellar/operations.js';

const extractStellarPaymentFacts = (
  scan: StellarActivityScanDocument,
  page: StellarOperationsResult,
): Array<Omit<StellarPaymentFactRecord, 'createdAt'>> => {
  const facts: Array<Omit<StellarPaymentFactRecord, 'createdAt'>> = [];

  for (const operation of page.items) {
    if (operation.type !== 'payment') {
      continue;
    }

    const from = operation.details.from;
    const to = operation.details.to;

    if (
      typeof from !== 'string' ||
      typeof to !== 'string' ||
      !isValidStellarGAddress(from) ||
      !isValidStellarGAddress(to) ||
      from === to ||
      (from !== scan.address && to !== scan.address)
    ) {
      continue;
    }

    const observedAt = new Date(operation.createdAt);

    if (Number.isNaN(observedAt.getTime())) {
      throw new Error('Stellar payment has an invalid timestamp');
    }

    facts.push({
      scan: scan._id,
      requestedByIdentity: scan.identity,
      address: scan.address,
      counterparty: from === scan.address ? to : from,
      sourceUrl: scan.sourceUrl,
      operationId: operation.pagingToken,
      transactionHash: operation.transactionHash,
      direction: from === scan.address ? 'outgoing' : 'incoming',
      observedAt,
    });
  }

  return facts;
};

export default extractStellarPaymentFacts;
