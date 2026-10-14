import type { RequestHandler } from 'express';

import log from '../../logger';
import getLegacyChart from './getLegacyChart';
import readLaunchChart from '../../services/launch/readLaunchChart';
import parseChartRequest from '../../utils/launch/parseChartRequest';

const getChart: RequestHandler = async (req, res, next) => {
  // Explicit range requests retain the existing interface response.
  if (req.query.range !== undefined) {
    if (
      req.query.timeframes !== undefined ||
      req.query.from !== undefined ||
      req.query.to !== undefined ||
      req.query.limit !== undefined
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Do not combine range with timeframe queries',
        result: {},
      });
    }

    return getLegacyChart(req, res, next);
  }

  const request = parseChartRequest(req);

  if (!request) {
    return res.status(400).json({ status: 'error', message: 'Invalid chart query', result: {} });
  }

  try {
    const chart = await readLaunchChart(request);

    if (!chart) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    res.set('Cache-Control', 'public, max-age=15');

    return res.json({ status: 'success', message: 'Chart retrieved', result: chart });
  } catch (error) {
    log.error({ error }, 'Chart read failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Chart is temporarily unavailable', result: {} });
  }
};

export default getChart;
