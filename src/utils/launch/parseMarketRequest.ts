import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import type { MarketIdentity } from '../../types/launch/market';

const parseMarketRequest = (req: Request): MarketIdentity | null => {
  if (req.launchIdentity) {
    return req.launchIdentity;
  }

  const network = req.network;
  const contractId = req.params.contractId;

  if (
    typeof contractId !== 'string' ||
    !StrKey.isValidContract(contractId)
  ) {
    return null;
  }

  return { network, contractId };
};

export default parseMarketRequest;
