import type { RequestHandler } from 'express';

const resolveChain: RequestHandler = (req, res, next): void => {
  const value = req.get('X-Chain');

  if (value !== undefined && value !== 'stellar' && value !== 'base') {
    res.status(400).json({ status: 'error', message: 'Invalid chain', result: {} });

    return;
  }

  req.chain = value ?? 'stellar';

  if (value !== undefined) {
    res.set('X-Chain', req.chain);
  }

  res.vary('X-Chain');

  next();
};

export default resolveChain;
