import type { RequestHandler } from 'express';

import log from '../../logger';
import getStatsTrades from '../../services/stats/getStatsTrades';
import parseStatsTradeQuery from '../../utils/stats/parseStatsTradeQuery';

const getTrades: RequestHandler = async (req, res): Promise<unknown> => {
  const now = new Date();
  const query = parseStatsTradeQuery(req.query, now);

  if (!query) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid statistics trade query', result: {} });
  }

  try {
    const result = await getStatsTrades(query, now);

    res.set('Cache-Control', 'public, max-age=5');

    return res.json({ status: 'success', message: 'Statistics trades retrieved', result });
  } catch (error) {
    log.error({ error }, 'Statistics trade list failed');

    return res.status(503).json({
      status: 'error',
      message: 'Statistics trades are temporarily unavailable',
      result: {},
    });
  }
};

export default getTrades;
