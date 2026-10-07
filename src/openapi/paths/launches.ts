import jsonResponse from '../../utils/openapi/jsonResponse';

const launchPaths = {
  '/v1/launches': {
    get: {
      tags: ['Launches'],
      summary: 'List confirmed bonding-curve launches indexed from the factory',
      operationId: 'getLaunches',
      security: [],
      parameters: [
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
        { in: 'query', name: 'owner', schema: {
          oneOf: [
            { $ref: '#/components/schemas/StellarAddress' },
            { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
          ],
        } },
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        '200': jsonResponse('Launches retrieved.', { $ref: '#/components/schemas/LaunchList' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/{contractId}': {
    get: {
      tags: ['Launches'],
      summary: 'Get a confirmed bonding-curve launch by child contract ID',
      operationId: 'getLaunchByContractId',
      security: [],
      parameters: [
        { in: 'path', name: 'contractId', required: true, schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' } },
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
      ],
      responses: {
        '200': jsonResponse('Launch retrieved.', { $ref: '#/components/schemas/Launch' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/{contractId}/home-domain': {
    get: {
      tags: ['Launches'],
      summary: 'Get the SEP-1 Home Domain status of an indexed launch asset',
      operationId: 'getLaunchHomeDomain',
      security: [],
      parameters: [
        { in: 'path', name: 'contractId', required: true, schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' } },
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
      ],
      responses: {
        '200': jsonResponse('Home Domain status retrieved.', { $ref: '#/components/schemas/HomeDomainStatus' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/{contractId}/home-domain/refresh': {
    post: {
      tags: ['Launches'],
      summary: 'Recheck issuer Home Domain for a connected launch owner or issuer wallet',
      operationId: 'refreshLaunchHomeDomain',
      parameters: [
        { in: 'path', name: 'contractId', required: true, schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' } },
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
      ],
      responses: {
        '200': jsonResponse('Home Domain refreshed.', { $ref: '#/components/schemas/HomeDomainStatus' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default launchPaths;
