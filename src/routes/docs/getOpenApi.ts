import type { Request, Response } from 'express';

import openApiDocument from '../../openapi/document.js';

const getOpenApiRoute = (_request: Request, response: Response) => {
  response.setHeader('Cache-Control', 'no-store');

  return response.json(openApiDocument);
};

export default getOpenApiRoute;
