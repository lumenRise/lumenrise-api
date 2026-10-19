import type { Request, Response, NextFunction } from 'express';

const resolveNetwork = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.get('X-Stellar-Network');
  const legacyNetwork = req.query.network;
  const network = header ?? legacyNetwork;

  if (
    (network !== undefined && network !== 'testnet' && network !== 'public') ||
    (header !== undefined && legacyNetwork !== undefined && header !== legacyNetwork)
  ) {
    res
      .status(400)
      .json({ status: 'error', message: 'Invalid or conflicting Stellar network', result: {} });

    return;
  }

  // TODO: Remove the testnet fallback once all clients send X-Stellar-Network.
  req.network = network ?? 'testnet';

  res.set('X-Stellar-Network', req.network);

  res.vary('X-Stellar-Network');

  next();
};

export default resolveNetwork;
