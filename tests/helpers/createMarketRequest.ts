import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

const createMarketRequest = (query: Record<string, unknown> = {}): Request =>
  ({
    network: query.network ?? 'testnet',
    params: { contractId: StrKey.encodeContract(Buffer.alloc(32, 1)) },
    query: { network: 'testnet', ...query },
  }) as unknown as Request;

export default createMarketRequest;
