import address from './address.js';
import type { StellarOperationResult } from '../../../src/types/stellar/operations.js';

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
