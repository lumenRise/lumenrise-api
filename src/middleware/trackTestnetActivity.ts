import type { Request, Response, NextFunction } from 'express';

import log from '../logger';
import recordTestnetActivity from '../services/launch/recordTestnetActivity';

const trackTestnetActivity = (req: Request, res: Response, next: NextFunction): void => {
  if (
    req.network !== 'testnet' ||
    req.method === 'OPTIONS' ||
    !/^\/v1\//i.test(req.path) ||
    /^\/v1\/(?:config|health|docs|openapi\.json)(?:\/|$)/i.test(req.path)
  ) {
    next();

    return;
  }

  const chain = req.chain;

  res.once('finish', (): void => {
    if (res.statusCode < 200 || res.statusCode >= 400) {
      return;
    }

    void recordTestnetActivity(chain, Date.now()).catch((error: unknown): void => {
      log.warn({ err: error, chain, network: 'testnet' }, 'Testnet activity notification failed');
    });
  });

  next();
};

export default trackTestnetActivity;
