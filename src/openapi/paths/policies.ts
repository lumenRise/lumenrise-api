import jsonResponse from '../../utils/openapi/jsonResponse.js';

const policyPaths = {
  '/v1/policies': {
    get: {
      tags: ['Policies'],
      summary: 'List up to 100 policy versions owned by the current identity',
      operationId: 'getPolicies',
      responses: {
        '200': jsonResponse('Policies retrieved.', { $ref: '#/components/schemas/PolicyList' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
    post: {
      tags: ['Policies'],
      summary: 'Create an immutable policy version',
      operationId: 'createPolicy',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PolicyDefinition' } },
        },
      },
      responses: {
        '201': jsonResponse('Policy created.', { $ref: '#/components/schemas/Policy' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/policies/{key}': {
    get: {
      tags: ['Policies'],
      summary: 'Get the latest owned policy version',
      operationId: 'getPolicyByKey',
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string', pattern: '^[a-z][a-z0-9-]{2,63}$' },
        },
      ],
      responses: {
        '200': jsonResponse('Policy retrieved.', { $ref: '#/components/schemas/Policy' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/policies/{key}/evaluate': {
    post: {
      tags: ['Policies'],
      summary: 'Evaluate the latest owned policy version against stored reputation',
      description:
        'Uses existing reputation snapshots; it does not contact external providers. Limited to one evaluation per identity and policy key every 15 minutes.',
      operationId: 'evaluatePolicy',
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string', pattern: '^[a-z][a-z0-9-]{2,63}$' },
        },
      ],
      responses: {
        '200': jsonResponse('Policy evaluated.', { $ref: '#/components/schemas/PolicyEvaluation' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default policyPaths;
