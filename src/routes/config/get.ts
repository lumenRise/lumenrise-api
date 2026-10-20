import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../types/response';
import type { PublicConfiguration } from '../../types/configuration/public';
import getPublicConfiguration from '../../services/configuration/getPublicConfiguration';

const getConfiguration: RequestHandler = (_req, res) => {
  const response: ApiResponse<PublicConfiguration> = {
    status: 'success',
    message: 'Public application configuration retrieved',
    result: getPublicConfiguration(),
  };

  res.set('Cache-Control', 'no-store');

  return res.status(200).json(response);
};

export default getConfiguration;
