import jsonResponse from '../../utils/openapi/jsonResponse.js';
import syncProviderPaths from '../../utils/openapi/syncProviderPaths.js';

const connectionPaths = {
  '/v1/connections': {
    get: {
      tags: ['Connections'],
      summary: 'List connected provider accounts and sync state',
      operationId: 'getConnections',
      responses: {
        '200': jsonResponse('Connections retrieved.', {
          $ref: '#/components/schemas/ConnectionsResult',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/v1/connections/{provider}': {
    delete: {
      tags: ['Connections'],
      summary: 'Disconnect a provider account',
      description:
        'Revokes or removes stored credentials, cancels active jobs and clears provider-specific reputation data as applicable.',
      operationId: 'disconnectProvider',
      parameters: [
        {
          in: 'path',
          name: 'provider',
          required: true,
          schema: { type: 'string', enum: ['github', 'gitlab', 'x'] },
        },
      ],
      responses: {
        '200': jsonResponse('Account disconnected.', { $ref: '#/components/schemas/EmptyResult' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  ...syncProviderPaths('github', 'GitHub'),
  ...syncProviderPaths('gitlab', 'GitLab'),
  ...syncProviderPaths('x', 'X'),
};

export default connectionPaths;
