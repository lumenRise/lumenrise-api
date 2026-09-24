import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import getOpenApiRoute from './getOpenApi.js';
import openApiDocument from '../../openapi/document.js';

const docsRoutes = Router();

docsRoutes.get('/openapi.json', getOpenApiRoute);
docsRoutes.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Lumenrise API Docs',
    swaggerOptions: { persistAuthorization: false, displayRequestDuration: true },
  }),
);

export default docsRoutes;
