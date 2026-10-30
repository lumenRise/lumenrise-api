import type { RequestHandler } from 'express';

import log from '../../logger';
import getProjectVolume from '../../services/stats/getProjectVolume';

const getVolume: RequestHandler = async (req, res): Promise<unknown> => {
  const network = req.route.path === '/volume/all' ? 'all' : req.network;

  try {
    const result = await getProjectVolume(network, new Date());

    res.set('Cache-Control', 'public, max-age=10');

    return res.json({ status: 'success', message: 'Project volume retrieved', result });
  } catch (error) {
    log.error({ error, network }, 'Project volume read failed');

    return res.status(503).json({
      status: 'error',
      message: 'Project volume is temporarily unavailable',
      result: {},
    });
  }
};

export default getVolume;
