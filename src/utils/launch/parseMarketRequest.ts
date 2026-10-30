import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import isBaseAddress from '../base/isBaseAddress';
import type { MarketIdentity } from '../../types/launch/market';

const parseMarketRequest = (req: Request): MarketIdentity | null => {
  if (req.launchIdentity) {
    return req.launchIdentity;
  }

  const network = req.network;
  const contractId = req.params.contractId;

  if (
    typeof contractId !== 'string' ||
    (req.chain === 'base' ? !isBaseAddress(contractId) : !StrKey.isValidContract(contractId))
  ) {
    return null;
  }

  return {
    chain: req.chain ?? 'stellar',
    network,
    contractId: req.chain === 'base' ? contractId.toLowerCase() : contractId,
  };
};

export default parseMarketRequest;
