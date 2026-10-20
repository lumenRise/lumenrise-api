import type { Request, Response, NextFunction } from 'express';

import { stellarNetworks, defaultStellarNetwork, stellarNetworkHeader } from '../constants/network';

const resolveNetwork = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.get(stellarNetworkHeader);
  const legacyNetwork = req.query.network;
  const network = header ?? legacyNetwork;
  const resolvedNetwork = stellarNetworks.find((value) => value === network);

  if (
    (network !== undefined && !resolvedNetwork) ||
    (header !== undefined && legacyNetwork !== undefined && header !== legacyNetwork)
  ) {
    res
      .status(400)
      .json({ status: 'error', message: 'Invalid or conflicting Stellar network', result: {} });

    return;
  }

  // TODO: Remove the testnet fallback once all clients send X-Stellar-Network.
  req.network = resolvedNetwork ?? defaultStellarNetwork;

  res.set(stellarNetworkHeader, req.network);

  res.vary(stellarNetworkHeader);

  next();
};

export default resolveNetwork;
