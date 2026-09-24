import env from '../../env.js';
import summarizeStellarActivityPage from './summarizeActivityPage.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import type {
  StellarHorizonOperationsPage,
  StellarOperationOrder,
  StellarOperationResult,
  StellarOperationsResult,
} from '../../types/stellar/operations.js';

const STELLAR_OPERATIONS_PAGE_LIMIT = 200;

const operationCommonFields = new Set([
  '_links',
  'id',
  'paging_token',
  'type',
  'type_i',
  'created_at',
  'transaction_hash',
  'transaction_successful',
  'source_account',
]);

const getStellarAccountOperations = async (
  address: string,
  cursor: string | null = null,
  limit = 50,
  order: StellarOperationOrder = 'desc',
  sourceUrl = env.STELLAR_HORIZON_URL,
): Promise<StellarOperationsResult | null> => {
  if (!isValidStellarGAddress(address)) {
    throw new Error('Invalid Stellar account address');
  }

  if (cursor !== null && !/^\d{1,40}$/.test(cursor)) {
    throw new Error('Invalid Stellar operations cursor');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > STELLAR_OPERATIONS_PAGE_LIMIT) {
    throw new Error('Invalid Stellar operations page limit');
  }

  if (order !== 'asc' && order !== 'desc') {
    throw new Error('Invalid Stellar operations order');
  }

  const url = new URL(`/accounts/${address}/operations`, sourceUrl);

  url.searchParams.set('order', order);
  url.searchParams.set('limit', limit.toString());

  if (cursor !== null) {
    url.searchParams.set('cursor', cursor);
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Stellar Horizon operations request failed with status ${response.status}`);
  }

  const page = (await response.json()) as StellarHorizonOperationsPage;
  const records = page?._embedded?.records;

  if (!Array.isArray(records) || records.length > limit) {
    throw new Error('Stellar Horizon returned an invalid operations response');
  }

  const items: StellarOperationResult[] = records.map((record) => {
    if (
      !/^\d{1,40}$/.test(record.paging_token) ||
      typeof record.type !== 'string' ||
      typeof record.type_i !== 'number' ||
      typeof record.created_at !== 'string' ||
      typeof record.transaction_hash !== 'string' ||
      typeof record.source_account !== 'string'
    ) {
      throw new Error('Stellar Horizon returned an invalid operation');
    }

    const details = Object.fromEntries(
      Object.entries(record).filter(([key]) => !operationCommonFields.has(key)),
    );

    return {
      pagingToken: record.paging_token,
      type: record.type,
      typeId: record.type_i,
      createdAt: record.created_at,
      transactionHash: record.transaction_hash,
      sourceAccount: record.source_account,
      details,
    };
  });

  const lastCursor = items.at(-1)?.pagingToken ?? null;

  if (cursor !== null && lastCursor === cursor) {
    throw new Error('Stellar Horizon returned a repeated operations cursor');
  }

  return {
    address,
    ownershipVerified: false,
    order,
    limit,
    items,
    summary: summarizeStellarActivityPage(address, items),
    nextCursor: items.length === limit ? lastCursor : null,
  };
};

export { STELLAR_OPERATIONS_PAGE_LIMIT };
export default getStellarAccountOperations;
