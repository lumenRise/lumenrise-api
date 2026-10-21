import jsonResponse from '../../utils/openapi/jsonResponse';

const migrationPaths = {
  '/v1/migrations': {
    get: {
      tags: ['System'],
      summary: 'List migration names recorded in the database',
      description:
        'Returns all distinct migration names stored in the connected database, including names from other repositories or removed files. Does not inspect migration files, verify execution status or execute migrations.',
      operationId: 'getMigrations',
      security: [],
      responses: {
        '200': jsonResponse('Migrations retrieved.', {
          type: 'object',
          required: ['migrations'],
          properties: {
            migrations: { type: 'array', items: { type: 'string' } },
          },
        }),
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default migrationPaths;
