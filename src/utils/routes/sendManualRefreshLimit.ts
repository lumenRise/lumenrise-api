import type { Response } from 'express';

import type { ApiResponse, EmptyResult } from '../../types/response.js';

const sendManualRefreshLimit = (res: Response, retryAt: Date): Response => {
  const retryAfter = Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1_000));
  const response: ApiResponse<EmptyResult> = {
    status: 'error',
    message: 'Wait before requesting another refresh',
    result: {},
  };

  res.setHeader('Retry-After', retryAfter.toString());

  return res.status(429).json(response);
};

export default sendManualRefreshLimit;
