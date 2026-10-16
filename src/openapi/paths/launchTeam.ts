import jsonResponse from '../../utils/openapi/jsonResponse';

const parameters = [
  {
    in: 'path',
    name: 'contractId',
    required: true,
    schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
  },
  { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
];

const memberParameters = [
  ...parameters,
  {
    in: 'path',
    name: 'identityId',
    required: true,
    schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  },
];

const profile = {
  type: 'object',
  required: ['identityId', 'name', 'avatarUrl'],
  properties: {
    identityId: { type: 'string' },
    name: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
  },
};

const member = {
  type: 'object',
  required: ['memberId', 'kind', 'identityId', 'name', 'avatarUrl', 'role', 'xAccount'],
  properties: {
    memberId: { type: 'string' },
    kind: { type: 'string', enum: ['registered', 'external'] },
    identityId: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    xAccount: { type: ['string', 'null'] },
    role: { type: 'string', minLength: 1, maxLength: 80 },
  },
};

const externalParameters = [
  ...parameters,
  {
    in: 'path',
    name: 'memberId',
    required: true,
    schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  },
];

const externalFields = {
  name: { type: 'string', minLength: 1, maxLength: 80 },
  role: { type: 'string', minLength: 1, maxLength: 80 },
  xAccount: {
    type: 'string',
    maxLength: 2048,
    minLength: 1,
    description: 'Required HTTPS X profile link for external members.',
  },
};

const externalMultipart = {
  type: 'object',
  required: ['name', 'role', 'xAccount'],
  properties: { ...externalFields, image: { type: 'string', format: 'binary' } },
};

const errors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
  '503': { $ref: '#/components/responses/ServiceUnavailable' },
};

const launchTeamPaths = {
  '/v1/launches/{contractId}/team/candidates': {
    get: {
      tags: ['Launches'],
      operationId: 'getLaunchTeamCandidates',
      summary: 'Search registered active users for the launch owner',
      description:
        'Owner only. Search by literal partial name or exact connected Stellar wallet address. Returns at most 20 users without exposing authentication identifiers. Suspended, deleted and unregistered identities are excluded.',
      parameters: [
        ...parameters,
        {
          in: 'query',
          name: 'search',
          required: true,
          schema: { type: 'string', minLength: 2, maxLength: 80 },
        },
      ],
      responses: {
        ...errors,
        '200': jsonResponse('Registered users retrieved.', {
          type: 'object',
          required: ['users'],
          properties: { users: { type: 'array', items: profile } },
        }),
      },
    },
  },
  '/v1/launches/{contractId}/team': {
    get: {
      tags: ['Launches'],
      operationId: 'getLaunchTeam',
      summary: 'Read the launch team as its owner',
      description:
        'Requires a registered user with a currently connected wallet matching the indexed launch owner. Returns registered and external team members; inactive registered profiles are excluded. Registered member X links are read from their currently connected X accounts and are null when not connected. Roles describe project responsibilities and grant no permissions.',
      parameters,
      responses: {
        ...errors,
        '200': jsonResponse('Launch team retrieved.', {
          type: 'object',
          required: ['members'],
          properties: { members: { type: 'array', items: member } },
        }),
      },
    },
  },
  '/v1/launches/{contractId}/team/external': {
    post: {
      tags: ['Launches'],
      operationId: 'postExternalLaunchTeamMember',
      summary: 'Add an external team member without creating a user account',
      description:
        'Owner only. Name, role, image and X are required. Images accept JPEG, PNG and WebP of at least 128x128 pixels, within the configured avatar upload limit. External membership and X links do not imply a verified account or grant permissions.',
      parameters,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { ...externalMultipart, required: ['name', 'role', 'image', 'xAccount'] },
          },
        },
      },
      responses: {
        ...errors,
        '201': jsonResponse('External team member added.', {
          type: 'object',
          required: ['member'],
          properties: { member },
        }),
        '413': { $ref: '#/components/responses/UploadLimitExceeded' },
      },
    },
  },
  '/v1/launches/{contractId}/team/external/{memberId}': {
    put: {
      tags: ['Launches'],
      operationId: 'putExternalLaunchTeamMember',
      summary: 'Update an external team member',
      description:
        'Owner only. Name, role and a non-empty HTTPS X link are required. A new image replaces the old image; omitting image preserves it. Registered users cannot be modified through this endpoint.',
      parameters: externalParameters,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': { schema: externalMultipart },
          'application/json': {
            schema: { type: 'object', required: ['name', 'role', 'xAccount'], properties: externalFields },
          },
        },
      },
      responses: {
        ...errors,
        '200': jsonResponse('External team member updated.', {
          type: 'object',
          required: ['member'],
          properties: { member },
        }),
        '409': { description: 'Member changed concurrently; retry the request.' },
        '413': { $ref: '#/components/responses/UploadLimitExceeded' },
      },
    },
    delete: {
      tags: ['Launches'],
      operationId: 'deleteExternalLaunchTeamMember',
      summary: 'Remove an external team member and clean up their image',
      parameters: externalParameters,
      responses: {
        ...errors,
        '200': jsonResponse('External team member removed.', {
          type: 'object',
          additionalProperties: false,
        }),
      },
    },
  },
  '/v1/launches/{contractId}/team/{identityId}': {
    put: {
      tags: ['Launches'],
      operationId: 'putLaunchTeamMember',
      summary: 'Add a registered user to a launch team or update their role',
      description:
        'Owner only. Idempotent per network, launch and identity. The target must be an active registered user. The role is trimmed and grants no management permissions.',
      parameters: memberParameters,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['role'],
              properties: { role: { type: 'string', minLength: 1, maxLength: 80 } },
            },
          },
        },
      },
      responses: {
        ...errors,
        '200': jsonResponse('Launch team member saved.', {
          type: 'object',
          required: ['member'],
          properties: { member },
        }),
        '409': { description: 'Concurrent team member creation; retry the same request.' },
      },
    },
    delete: {
      tags: ['Launches'],
      operationId: 'deleteLaunchTeamMember',
      summary: 'Remove a member from a launch team',
      description:
        'Owner only. Succeeds even if the member was already absent. Does not delete the user account.',
      parameters: memberParameters,
      responses: {
        ...errors,
        '200': jsonResponse('Launch team member removed.', {
          type: 'object',
          additionalProperties: false,
        }),
      },
    },
  },
};

export default launchTeamPaths;
