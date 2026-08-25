import type { RequestHandler } from 'express';

import type { ApiResponse, EmptyResult } from '../types/response.js';

const notFound: RequestHandler = (_req, res) => {
  const response: ApiResponse<EmptyResult> = {
    status: 'error',
    message: 'Route not found',
    result: {},
  };

  return res.status(404).json(response);
};

export default notFound;
