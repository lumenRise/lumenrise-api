import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import env from '../../env';
import type { MarketIdentity } from '../../types/launch/market';

const parseMarketRequest = (req: Request): MarketIdentity | null => {
  const network = req.query.network ?? env.STELLAR_AUTH_NETWORK;
  const contractId = req.params.contractId;

  if (
    (network !== 'testnet' && network !== 'public') ||
    typeof contractId !== 'string' ||
    !StrKey.isValidContract(contractId)
  ) {
    return null;
  }

  return { network, contractId };
};

export default parseMarketRequest;
