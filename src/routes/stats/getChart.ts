import type { RequestHandler } from 'express';

import log from '../../logger';
import getStatsChart from '../../services/stats/getStatsChart';
import parseStatsChartQuery from '../../utils/stats/parseStatsChartQuery';

const getChart: RequestHandler = async (req, res): Promise<unknown> => {
  const now = new Date();
  const query = parseStatsChartQuery(req.query, now);

  if (!query) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid statistics chart query', result: {} });
  }

  try {
    const result = await getStatsChart(query, now);

    res.set('Cache-Control', 'public, max-age=10');

    return res.json({ status: 'success', message: 'Statistics chart retrieved', result });
  } catch (error) {
    log.error({ error }, 'Statistics chart failed');

    return res.status(503).json({
      status: 'error',
      message: 'Statistics chart is temporarily unavailable',
      result: {},
    });
  }
};

export default getChart;
