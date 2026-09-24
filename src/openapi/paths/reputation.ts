import jsonResponse from '../../utils/openapi/jsonResponse.js';

const paginationParameters = [
  {
    in: 'query',
    name: 'limit',
    description: 'Page size. Defaults to 50; integer values are clamped to 1–100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
  },
  {
    in: 'query',
    name: 'cursor',
    description: 'ObjectId returned as nextCursor by the previous page.',
    schema: { $ref: '#/components/schemas/ObjectId' },
  },
];

const reputationPaths = {
  '/v1/reputation/developer': {
    get: {
      tags: ['Reputation'],
      summary: 'Get GitHub developer data',
      operationId: 'getGitHubReputation',
      responses: {
        '200': jsonResponse('GitHub data retrieved.', {
          $ref: '#/components/schemas/GitHubSnapshot',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/developer/repositories': {
    get: {
      tags: ['Reputation'],
      summary: 'Page through collected GitHub repositories',
      operationId: 'getGitHubRepositories',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse('Repositories retrieved.', {
          $ref: '#/components/schemas/GitHubRepositories',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/developer/score': {
    get: {
      tags: ['Reputation'],
      summary: 'Get explainable developer score',
      operationId: 'getDeveloperScore',
      description:
        'Combines available GitHub and GitLab signals; status indicates complete or partial data.',
      responses: {
        '200': jsonResponse('Developer score retrieved.', {
          $ref: '#/components/schemas/ReputationScore',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/developer/gitlab': {
    get: {
      tags: ['Reputation'],
      summary: 'Get GitLab developer data',
      operationId: 'getGitLabReputation',
      responses: {
        '200': jsonResponse('GitLab data retrieved.', {
          $ref: '#/components/schemas/GitLabSnapshot',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/developer/gitlab/projects': {
    get: {
      tags: ['Reputation'],
      summary: 'Page through collected GitLab projects',
      operationId: 'getGitLabProjects',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse('Projects retrieved.', { $ref: '#/components/schemas/GitLabProjects' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/developer/gitlab/events': {
    get: {
      tags: ['Reputation'],
      summary: 'Page through collected GitLab events',
      operationId: 'getGitLabEvents',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse('Events retrieved.', { $ref: '#/components/schemas/GitLabEvents' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/social/x': {
    get: {
      tags: ['Reputation'],
      summary: 'Get X social data',
      operationId: 'getXSocialData',
      responses: {
        '200': jsonResponse('X data retrieved.', { $ref: '#/components/schemas/XSnapshot' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/social/score': {
    get: {
      tags: ['Reputation'],
      summary: 'Get explainable X social score',
      operationId: 'getSocialScore',
      responses: {
        '200': jsonResponse('Social score retrieved.', {
          $ref: '#/components/schemas/ReputationScore',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/v1/reputation/stellar': {
    get: {
      tags: ['Reputation'],
      summary: 'Get reputation for the verified primary Stellar wallet',
      operationId: 'getVerifiedStellarReputation',
      description:
        'Returns the primary registered wallet, latest scan status and score only when the scan is complete. A score is not eligibility proof.',
      responses: {
        '200': jsonResponse('Stellar reputation retrieved.', {
          $ref: '#/components/schemas/StellarReputation',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default reputationPaths;
