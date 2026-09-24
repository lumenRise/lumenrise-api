import jsonResponse from './jsonResponse.js';

const syncProviderPaths = (provider: string, displayName: string) => ({
  [`/v1/connections/${provider}/sync`]: {
    post: {
      tags: ['Connections'],
      summary: `Queue ${displayName} synchronization`,
      description:
        'Requires a connected provider account. A background worker processes the job; inspect the returned status URL.',
      operationId: `queue${displayName}Sync`,
      responses: {
        '202': {
          ...jsonResponse('Synchronization queued.', {
            $ref: '#/components/schemas/IntegrationSyncJob',
          }),
          headers: { Location: { description: 'Job status URL.', schema: { type: 'string' } } },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  [`/v1/connections/${provider}/sync/{jobId}`]: {
    get: {
      tags: ['Connections'],
      summary: `Get ${displayName} synchronization job`,
      operationId: `get${displayName}SyncJob`,
      parameters: [
        {
          in: 'path',
          name: 'jobId',
          required: true,
          schema: { $ref: '#/components/schemas/ObjectId' },
        },
      ],
      responses: {
        '200': jsonResponse('Job retrieved.', { $ref: '#/components/schemas/IntegrationSyncJob' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
});

export default syncProviderPaths;
