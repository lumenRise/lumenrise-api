import type { RequestHandler } from 'express';

import type { HealthResult } from '../../types/health.js';
import type { ApiResponse } from '../../types/response.js';

const getHealthRoute: RequestHandler = (_req, res) => {
  const response: ApiResponse<HealthResult> = {
    status: 'success',
    message: 'Lumenrise API is healthy',
    result: {
      service: 'lumenrise-api',
      state: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };

  return res.status(200).json(response);
};

export default getHealthRoute;
