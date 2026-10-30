import type { Request, Response, NextFunction } from 'express';

import { stellarNetworks, defaultStellarNetwork, stellarNetworkHeader } from '../constants/network';

const resolveNetwork = (req: Request, res: Response, next: NextFunction): void => {
  const baseNetwork = req.get('X-Network');
  const stellarHeader = req.get(stellarNetworkHeader);
  const header = req.chain === 'base' ? baseNetwork : stellarHeader;
  const legacyNetwork = req.query.network;
  const network = header ?? legacyNetwork;
  const resolvedNetwork = stellarNetworks.find((value) => value === network);

  if (
    (req.chain === 'base' && stellarHeader !== undefined) ||
    (req.chain === 'stellar' && baseNetwork !== undefined) ||
    (network !== undefined && !resolvedNetwork) ||
    (header !== undefined && legacyNetwork !== undefined && header !== legacyNetwork)
  ) {
    res.status(400).json({
      status: 'error',
      message:
        req.chain === 'base'
          ? 'Invalid or conflicting Base network'
          : 'Invalid or conflicting Stellar network',
      result: {},
    });

    return;
  }

  // TODO: Remove the testnet fallback once all clients send X-Stellar-Network.
  req.network = resolvedNetwork ?? defaultStellarNetwork;

  res.set(req.chain === 'base' ? 'X-Network' : stellarNetworkHeader, req.network);

  res.vary(stellarNetworkHeader);

  res.vary('X-Network');

  next();
};

export default resolveNetwork;
