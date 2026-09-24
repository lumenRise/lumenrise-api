const docsPaths = {
  '/v1/openapi.json': {
    get: {
      tags: ['System'],
      summary: 'Download the OpenAPI document',
      operationId: 'getOpenApiDocument',
      security: [],
      responses: {
        '200': {
          description: 'The OpenAPI 3.1 document.',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/v1/docs/': {
    get: {
      tags: ['System'],
      summary: 'Open interactive API documentation',
      operationId: 'getApiDocs',
      security: [],
      responses: {
        '200': {
          description: 'Swagger UI page.',
          content: { 'text/html': { schema: { type: 'string' } } },
        },
      },
    },
  },
} as const;

export default docsPaths;
