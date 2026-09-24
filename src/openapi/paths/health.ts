import jsonResponse from '../../utils/openapi/jsonResponse.js';

const healthPaths = {
  '/v1/health': {
    get: {
      tags: ['System'],
      summary: 'Check API health',
      operationId: 'getHealth',
      security: [],
      responses: {
        '200': jsonResponse('The API is healthy.', { $ref: '#/components/schemas/HealthResult' }),
      },
    },
  },
} as const;

export default healthPaths;
