import jsonResponse from '../../utils/openapi/jsonResponse';

const launchPaths = {
  '/v1/launches': {
    get: {
      tags: ['Launches'],
      summary: 'Search, filter and rank confirmed launches before pagination',
      description:
        'All filters and sorting apply globally before pagination. Newest/date use verified contract creation time, never startsAt or observedAt; unknown dates sort last in both directions. Categories currently contain only bonding-curve launches; auction and pre-sale return empty results. Trending counts verified client-submitted trades in the rolling 24-hour window. Top volume requires pair (payment asset contract ID). Almost graduated includes only open, ungraduated curves with valid positive targets, ordered by net reserve / target; no minimum progress threshold. Equal sort values use contractId ascending. 24-hour statistics cover verified client-submitted trades, not all chain activity.',
      operationId: 'getLaunches',
      security: [],
      parameters: [
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
        {
          in: 'query',
          name: 'search',
          description:
            'Literal, case-insensitive substring of project name or token symbol; q is an alias.',
          schema: { type: 'string', maxLength: 100 },
        },
        { in: 'query', name: 'q', schema: { type: 'string', maxLength: 100 } },
        {
          in: 'query',
          name: 'category',
          description: 'Case-insensitive; Bonding Curve is also accepted.',
          schema: {
            type: 'string',
            enum: ['all', 'bonding-curve', 'auction', 'pre-sale'],
            default: 'all',
          },
        },
        {
          in: 'query',
          name: 'sort',
          description:
            'date aliases newest; figure is net curve reserve and requires pair; phase orders Scheduled, Open, Graduated, Failed.',
          schema: {
            type: 'string',
            enum: [
              'newest',
              'name',
              'symbol',
              'trending',
              'topVolume',
              'almostGraduated',
              'participants',
              'figure',
              'date',
              'phase',
              'category',
            ],
            default: 'newest',
          },
        },
        {
          in: 'query',
          name: 'direction',
          description: 'dir is an alias.',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
        { in: 'query', name: 'dir', schema: { type: 'string', enum: ['asc', 'desc'] } },
        {
          in: 'query',
          name: 'pair',
          description:
            'Payment asset contract ID. Required for topVolume and figure to avoid comparing different currencies.',
          schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
        },
        {
          in: 'query',
          name: 'owner',
          schema: {
            oneOf: [
              { $ref: '#/components/schemas/StellarAddress' },
              { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
            ],
          },
        },
        {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1, maximum: 100_000, default: 1 },
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        '200': jsonResponse('Launches retrieved.', { $ref: '#/components/schemas/LaunchList' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/prelaunch': {
    post: {
      tags: ['Launches'],
      summary: 'Save a token image, required description and optional project links before signing a launch transaction',
      operationId: 'postPrelaunch',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['name', 'description', 'ownerAddress', 'image'],
              properties: {
                network: { type: 'string', enum: ['testnet', 'public'] },
                name: { type: 'string', minLength: 1, maxLength: 2048, description: 'Project name. Its normalized slug must contain 1 to 100 characters and be unique within the network. Spaces and punctuation become hyphens; case is ignored. team and prelaunch are reserved.' },
                description: { type: 'string', minLength: 1, maxLength: 10_000, description: 'Required project description stored by the server. The contract description is ignored.' },
                ownerAddress: { $ref: '#/components/schemas/StellarAddress' },
                image: { type: 'string', format: 'binary' },
                website: { type: 'string', maxLength: 2048 },
                xAccount: { type: 'string', maxLength: 2048 },
              },
            },
          },
        },
      },
      responses: {
        '201': jsonResponse('Token image uploaded and pending chain confirmation.', {
          type: 'object',
          required: ['imageId', 'publicUrl', 'status', 'slug', 'name', 'description'],
          properties: {
            slug: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            imageId: { type: 'string' },
            publicUrl: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['pending'] },
          },
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { description: 'Project name is already taken or reserved in this network.' },
        '413': { $ref: '#/components/responses/UploadLimitExceeded' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/prelaunch/{imageId}': {
    get: {
      tags: ['Launches'],
      summary: 'Read the current token image state for its owner',
      operationId: 'getLaunchImage',
      parameters: [
        {
          in: 'path',
          name: 'imageId',
          required: true,
          schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
        },
      ],
      responses: {
        '200': jsonResponse('Token image retrieved.', {
          type: 'object',
          required: [
            'imageId',
            'network',
            'ownerAddress',
            'publicUrl',
            'status',
            'launchContractId',
            'assetContractId',
            'cleanupReadyAt',
            'expiredAt',
          ],
          properties: {
            imageId: { type: 'string' },
            slug: { type: ['string', 'null'] },
            name: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            network: { type: 'string', enum: ['testnet', 'public'] },
            ownerAddress: { $ref: '#/components/schemas/StellarAddress' },
            publicUrl: { type: 'string', format: 'uri' },
            website: { type: 'string', format: 'uri' },
            xAccount: { type: 'string', format: 'uri' },
            status: {
              type: 'string',
              enum: ['pending', 'cleanup_ready', 'deleting', 'finalized', 'expired'],
            },
            launchContractId: { type: ['string', 'null'] },
            assetContractId: { type: ['string', 'null'] },
            cleanupReadyAt: { type: ['string', 'null'], format: 'date-time' },
            expiredAt: { type: ['string', 'null'], format: 'date-time' },
          },
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/launches/{slug}': {
    get: {
      tags: ['Launches'],
      summary: 'Get a confirmed bonding-curve launch by project slug',
      operationId: 'getLaunchBySlug',
      security: [],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string', maxLength: 100, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        },
        { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
      ],
      responses: {
        '200': jsonResponse('Launch retrieved.', {
          allOf: [
            { $ref: '#/components/schemas/Launch' },
            {
              type: 'object',
              required: ['team'],
              properties: {
                team: {
                  type: 'array',
                  minItems: 1,
                  description:
                    'Only active members are public. Pending and canceled invitations are excluded. Public team, with the indexed owner first and role owner. The owner is included even without other members or an available profile. Duplicate owner membership is omitted. Inactive registered profiles are excluded.',
                  items: {
                    type: 'object',
                    required: [
                      'status',
                      'memberId',
                      'kind',
                      'identityId',
                      'address',
                      'name',
                      'avatarUrl',
                      'xAccount',
                      'role',
                    ],
                    properties: {
                      status: { type: 'string', enum: ['active'] },
                      memberId: { type: ['string', 'null'] },
                      kind: { type: 'string', enum: ['owner', 'registered', 'external'] },
                      identityId: { type: ['string', 'null'] },
                      address: {
                        type: ['string', 'null'],
                        description:
                          'Indexed wallet or contract address for the owner; null for other members.',
                      },
                      name: { type: ['string', 'null'] },
                      avatarUrl: { type: ['string', 'null'] },
                      xAccount: { type: ['string', 'null'] },
                      role: { type: 'string' },
                    },
                  },
                },
              },
            },
          ],
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default launchPaths;
