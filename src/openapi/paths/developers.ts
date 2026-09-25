import jsonResponse from '../../utils/openapi/jsonResponse.js';

const developerPaths = {
  '/v1/developers/keys': {
    get: {
      tags: ['Developers'],
      summary: 'List API keys owned by the authenticated identity',
      operationId: 'getDeveloperApiKeys',
      responses: {
        '200': jsonResponse('API keys retrieved.', {
          $ref: '#/components/schemas/DeveloperApiKeyList',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
    post: {
      tags: ['Developers'],
      summary: 'Create an API key for the authenticated identity',
      operationId: 'createDeveloperApiKey',
      description:
        'The raw API key appears only in the creation response. Maximum 10 active keys per identity; keys expire after 90 days.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['label'],
              additionalProperties: false,
              properties: { label: { type: 'string', minLength: 1, maxLength: 80 } },
            },
          },
        },
      },
      responses: {
        '201': jsonResponse('API key created.', {
          $ref: '#/components/schemas/DeveloperApiKeyCreated',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/developers/keys/{id}': {
    delete: {
      tags: ['Developers'],
      summary: 'Revoke an API key owned by the authenticated identity',
      operationId: 'revokeDeveloperApiKey',
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
      ],
      responses: {
        '200': jsonResponse('API key revoked.', { $ref: '#/components/schemas/EmptyResult' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/developers/profile': {
    get: {
      tags: ['Developers'],
      summary: 'Read only the API key owner reputation profile',
      operationId: 'getDeveloperOwnProfile',
      description:
        'Send the key in X-API-Key. Reads existing stored reputation only. A shared quota of 60 requests per minute applies across all keys of the same identity. No access to other identities or write operations.',
      security: [{ developerApiKey: [] }],
      responses: {
        '200': jsonResponse('Reputation profile retrieved.', {
          $ref: '#/components/schemas/ReputationProfile',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default developerPaths;
