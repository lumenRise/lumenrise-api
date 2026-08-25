import type { ErrorRequestHandler } from 'express';

import log from '../logger.js';
import type { ApiResponse, EmptyResult } from '../types/response.js';

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  log.error(
    {
      error,
      method: req.method,
      path: req.originalUrl,
    },
    'Unhandled request error',
  );

  const response: ApiResponse<EmptyResult> = {
    status: 'error',
    message: 'Something went wrong',
    result: {},
  };

  return res.status(500).json(response);
};

export default errorHandler;
