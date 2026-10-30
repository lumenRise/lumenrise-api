import type { RequestHandler } from 'express';

const requireStellarChain: RequestHandler = (req, res, next): void => {
  if (req.chain === 'base') {
    res
      .status(400)
      .json({ status: 'error', message: 'This endpoint supports Stellar only', result: {} });

    return;
  }

  next();
};

export default requireStellarChain;
