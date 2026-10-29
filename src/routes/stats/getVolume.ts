import type { RequestHandler } from 'express';

import log from '../../logger';
import getProjectVolume from '../../services/stats/getProjectVolume';

const getVolume: RequestHandler = async (req, res): Promise<unknown> => {
  try {
    const result = await getProjectVolume(req.network, new Date());

    res.set('Cache-Control', 'public, max-age=10');

    return res.json({ status: 'success', message: 'Project volume retrieved', result });
  } catch (error) {
    log.error({ error, network: req.network }, 'Project volume read failed');

    return res.status(503).json({
      status: 'error',
      message: 'Project volume is temporarily unavailable',
      result: {},
    });
  }
};

export default getVolume;
