import type { RequestHandler } from 'express';

import getBaseConfiguration from './getBase';
import type { ApiResponse } from '../../types/response';
import type { PublicConfiguration } from '../../types/configuration/public';
import getPublicConfiguration from '../../services/configuration/getPublicConfiguration';

const getConfiguration: RequestHandler = (req, res, next) => {
  if (req.chain === 'base') {
    return getBaseConfiguration(req, res, next);
  }

  const response: ApiResponse<PublicConfiguration> = {
    status: 'success',
    message: 'Public application configuration retrieved',
    result: getPublicConfiguration(),
  };

  res.set('Cache-Control', 'no-store');

  return res.status(200).json(response);
};

export default getConfiguration;
