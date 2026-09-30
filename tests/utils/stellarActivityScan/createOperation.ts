import address from './address';
import type { StellarOperationResult } from '../../../src/types/stellar/operations';
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

export default createOperation;
