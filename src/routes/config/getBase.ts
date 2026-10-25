import type { RequestHandler } from 'express';

import getPublicBaseConfiguration from '../../services/configuration/getPublicBaseConfiguration';

const getBaseConfiguration: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    status: 'success',
    message: 'Public application configuration retrieved',
    result: getPublicBaseConfiguration(),
  });
};

export default getBaseConfiguration;
