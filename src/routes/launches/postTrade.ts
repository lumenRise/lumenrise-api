import type { RequestHandler } from 'express';

import postBaseTrade from './postBaseTrade';
import submitStellarTransaction from '../../services/launch/submitStellarTransaction';

const postTrade: RequestHandler = async (req, res, next): Promise<unknown> => {
  if (req.chain === 'base') {
    return postBaseTrade(req, res, next);
  }

  return submitStellarTransaction(req, res, next);
};

export default postTrade;
