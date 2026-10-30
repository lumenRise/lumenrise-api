import type { RequestHandler } from 'express';

import postBaseConfirmation from './postBaseConfirmation';
import postStellarConfirmation from './postStellarConfirmation';

const postConfirmation: RequestHandler = async (req, res, next): Promise<unknown> => {
  const hash: unknown = req.body?.transactionHash;
  const pattern = req.chain === 'base' ? /^0x[a-fA-F0-9]{64}$/ : /^[a-fA-F0-9]{64}$/;

  if (
    typeof hash !== 'string' ||
    !pattern.test(hash) ||
    (req.body?.network !== undefined && req.body.network !== req.network)
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid launch confirmation', result: {} });
  }

  return req.chain === 'base'
    ? postBaseConfirmation(req, res, next)
    : postStellarConfirmation(req, res, next);
};

export default postConfirmation;
