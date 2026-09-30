import jsonResponse from '../../utils/openapi/jsonResponse';

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
  '/v1/reputation/sybil/evidence': {
    get: {
      tags: ['Reputation'],
      summary: 'Get diagnostic evidence for the authenticated identity',
      operationId: 'getSybilEvidence',
      description:
        'Read-only, versioned observations plus an activity corroboration score across complete, recent GitHub and primary-wallet Horizon data. Missing or stale inputs produce a null score. This is not a Sybil risk score, verdict, unique-person proof or policy input; no cross-identity analysis. Horizon scans cover available history only.',
      responses: {
        '200': jsonResponse('Sybil evidence retrieved.', {
          $ref: '#/components/schemas/SybilEvidence',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/reputation/profile': {
    get: {
      tags: ['Reputation'],
      summary: 'Get the current identity reputation profile',
      operationId: 'getReputationProfile',
      description:
        'Combines existing developer, social and verified primary Stellar wallet evidence without calculating an overall score. Unavailable, disconnected, previous-connection or older-than-90-day scores are null. Each available score retains its own algorithm version and source timestamps.',
      responses: {
        '200': jsonResponse('Reputation profile retrieved.', {
          $ref: '#/components/schemas/ReputationProfile',
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
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
      description: 'Historical GitHub snapshots and their repository pages are retained for 90 days.',
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
        'Uses available GitHub signals from the current connected account. Status indicates complete or partial data. Scores older than 90 days, or from a disconnected or previous account, are unavailable.',
      responses: {
        '200': jsonResponse('Developer score retrieved.', {
          $ref: '#/components/schemas/ReputationScore',
        }),
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
      description: 'Returns a complete or partial score only from the current connected X account. Scores older than 90 days, or from a disconnected or previous account, are unavailable.',
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
        'Returns the primary verified wallet, latest scan status and score only when the scan is complete. The score uses the scan aggregate and does not wait for separate Soroban evidence lookup. A scan alone proves neither wallet ownership nor Sybil behavior; the score is not eligibility proof.',
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
