import type { RequestHandler } from 'express';

import log from '../../logger';
import getMarketStats from '../../services/stats/getMarketStats';

const getMarket: RequestHandler = async (_req, res): Promise<unknown> => {
  try {
    const result = await getMarketStats(new Date());

    res.set('Cache-Control', 'public, max-age=10');

    return res.json({ status: 'success', message: 'Market statistics retrieved', result });
  } catch (error) {
    log.error({ error }, 'Market statistics read failed');

    return res.status(503).json({
      status: 'error',
      message: 'Market statistics are temporarily unavailable',
      result: {},
    });
  }
};

export default getMarket;
