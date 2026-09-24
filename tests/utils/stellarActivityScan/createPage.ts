import address from './address.js';
import summarizeStellarActivityPage from '../../../src/services/stellar/summarizeActivityPage.js';
import type {
  StellarOperationResult,
  StellarOperationsResult,
} from '../../../src/types/stellar/operations.js';

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

export default createPage;
