import jsonResponse from '../../utils/openapi/jsonResponse.js';

const addressParameter = {
  in: 'path',
  name: 'address',
  required: true,
  description: 'Stellar G address. Public Horizon data does not prove wallet ownership.',
  schema: { $ref: '#/components/schemas/StellarAddress' },
};

const stellarPaths = {
  '/v1/stellar/accounts/{address}': {
    get: {
      tags: ['Stellar'],
      summary: 'Read public Stellar account overview',
      operationId: 'getStellarAccount',
      parameters: [addressParameter],
      responses: {
        '200': jsonResponse('Account overview retrieved.', {
          $ref: '#/components/schemas/StellarAccountOverview',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '502': { $ref: '#/components/responses/BadGateway' },
      },
    },
  },
  '/v1/stellar/accounts/{address}/operations': {
    get: {
      tags: ['Stellar'],
      summary: 'Page through Stellar account operations',
      operationId: 'getStellarOperations',
      description:
        'Each page is limited to 200 operations. Continue with nextCursor to inspect more of the history available from the configured Horizon server.',
      parameters: [
        addressParameter,
        { in: 'query', name: 'cursor', schema: { type: 'string', pattern: '^\\d{1,40}$' } },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
        {
          in: 'query',
          name: 'order',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      ],
      responses: {
        '200': jsonResponse('Operations page retrieved.', {
          $ref: '#/components/schemas/StellarOperations',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '502': { $ref: '#/components/responses/BadGateway' },
      },
    },
  },
  '/v1/stellar/accounts/{address}/activity-scan': {
    post: {
      tags: ['Stellar'],
      summary: 'Queue a resumable Stellar activity scan',
      operationId: 'queueStellarActivityScan',
      description:
        'Scans operations available from the configured Horizon server. The same identity may have only one active scan at a time.',
      parameters: [addressParameter],
      responses: {
        '202': jsonResponse('Scan queued.', { $ref: '#/components/schemas/StellarScan' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
    get: {
      tags: ['Stellar'],
      summary: 'Get the latest Stellar activity scan',
      operationId: 'getStellarActivityScan',
      parameters: [addressParameter],
      responses: {
        '200': jsonResponse('Scan retrieved.', { $ref: '#/components/schemas/StellarScan' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/stellar/accounts/{address}/activity-score': {
    get: {
      tags: ['Stellar'],
      summary: 'Score activity for an address with a completed scan',
      operationId: 'getStellarActivityScore',
      description:
        'This address-only score does not verify ownership and is not eligibility proof.',
      parameters: [addressParameter],
      responses: {
        '200': jsonResponse('Activity score retrieved.', {
          $ref: '#/components/schemas/StellarActivityScore',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default stellarPaths;
