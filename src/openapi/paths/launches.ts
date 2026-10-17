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
      summary: 'Save a token image and optional project links before signing a launch transaction',
      operationId: 'postPrelaunch',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['network', 'ownerAddress', 'image'],
              properties: {
                network: { type: 'string', enum: ['testnet', 'public'] },
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
          required: ['imageId', 'publicUrl', 'status'],
          properties: {
            imageId: { type: 'string' },
            publicUrl: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['pending'] },
          },
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
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
  '/v1/launches/{contractId}': {
    get: {
      tags: ['Launches'],
      summary: 'Get a confirmed bonding-curve launch by child contract ID',
      operationId: 'getLaunchByContractId',
      security: [],
      parameters: [
        {
          in: 'path',
          name: 'contractId',
          required: true,
          schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
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
                    'Public team, with the indexed owner first and role owner. The owner is included even without other members or an available profile. Duplicate owner membership is omitted. Inactive registered profiles are excluded.',
                  items: {
                    type: 'object',
                    required: [
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
