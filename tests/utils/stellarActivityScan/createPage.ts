import address from './address';
import summarizeStellarActivityPage from '../../../src/services/stellar/summarizeActivityPage';
import type {
  StellarOperationResult,
  StellarOperationsResult,
} from '../../../src/types/stellar/operations';

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
