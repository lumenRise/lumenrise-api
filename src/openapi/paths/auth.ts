import jsonResponse from '../../utils/openapi/jsonResponse';

const authPaths = {
  '/v1/auth/status': {
    get: {
      tags: ['Authentication'],
      summary: 'Check registration for an Auth provider user',
      description:
        'Send the Auth provider user ID in x-user-id. For Base, also send Authorization: Bearer <Privy access token>; its authenticated DID must match x-user-id. This database lookup does not verify wallet ownership or issue credentials. A registered user has an active identity and a completed name.',
      operationId: 'getRegistrationStatus',
      security: [],
      parameters: [
        {
          in: 'header',
          name: 'x-user-id',
          required: true,
          schema: { $ref: '#/components/schemas/ExternalUserId' },
        },
      ],
      responses: {
        '200': jsonResponse('Registration status.', {
          $ref: '#/components/schemas/RegistrationStatus',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/resolve': {
    post: {
      tags: ['Authentication'],
      summary: 'Resolve an identity using a verified wallet',
      description:
        'Send the current Blux userId and selected Stellar address after login. For Base, send X-Chain: base, Authorization: Bearer <Privy access token>, a matching Privy DID and an EVM address; the server verifies the token and checks linked Privy wallets. For Stellar, verifies the exact pair with Blux, then links an alternate user ID to the existing active wallet identity. Returns registered false when no identity exists or the name is incomplete. Conflicting identities are never merged. Does not issue credentials.',
      operationId: 'resolveIdentity',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId', 'address'],
              properties: {
                userId: { $ref: '#/components/schemas/ExternalUserId' },
                address: { type: 'string', pattern: '^(G[A-Z2-7]{55}|0x[a-fA-F0-9]{40})$' },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResponse('Resolved registration status.', {
          $ref: '#/components/schemas/RegistrationStatus',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register an Auth provider user and verified Stellar wallets',
      description:
        'Verifies the supplied user ID and Stellar wallets with the configured Auth provider. For Base, send X-Chain: base and Authorization: Bearer <Privy access token>; the server verifies that its authenticated DID matches userId and checks linked EVM wallets with Privy. Completes registration idempotently where applicable. Does not create a signing challenge, issue a JWT or set a session cookie. For an avatar use multipart/form-data; JPEG, PNG or WebP, at least 128x128 pixels, subject to the configured upload size limit.',
      operationId: 'postRegistration',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegistrationRequest' } },
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['userId', 'name'],
              properties: {
                userId: { $ref: '#/components/schemas/ExternalUserId' },
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 80,
                  description: 'Trimmed, nonempty display name.',
                },
                address: {
                  type: 'string',
                  pattern: '^(G[A-Z2-7]{55}|0x[a-fA-F0-9]{40})$',
                  description: 'Optional selected wallet; verified against userId.',
                },
                avatar: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResponse('Auth provider user registered.', {
          $ref: '#/components/schemas/RegistrationResult',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '413': { $ref: '#/components/responses/UploadLimitExceeded' },
        '422': {
          description: 'The verified Auth provider user has no Stellar wallet.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/session': {
    get: {
      tags: ['Authentication'],
      summary: 'Inspect the identity selected by x-user-id',
      description:
        'For Base and all other protected Base endpoints, send Authorization: Bearer <Privy access token> with x-user-id matching the authenticated Privy DID.',
      operationId: 'getSession',
      responses: {
        '200': jsonResponse('User identified.', { $ref: '#/components/schemas/SessionResult' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
} as const;

export default authPaths;
