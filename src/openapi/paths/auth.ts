import jsonBody from '../../utils/openapi/jsonBody.js';
import jsonResponse from '../../utils/openapi/jsonResponse.js';

const authPaths = {
  '/v1/auth/wallet/challenge': {
    post: {
      tags: ['Authentication'],
      summary: 'Create a single-use wallet signing challenge',
      description:
        'Sign the returned message exactly as supplied. Challenges expire after five minutes and are consumed once. No Stellar transaction is submitted.',
      operationId: 'createWalletChallenge',
      security: [],
      requestBody: jsonBody({
        oneOf: [
          {
            type: 'object',
            required: ['address', 'purpose', 'name'],
            additionalProperties: false,
            properties: {
              address: { $ref: '#/components/schemas/StellarAddress' },
              purpose: { type: 'string', const: 'register' },
              name: { type: 'string', minLength: 2, maxLength: 80 },
            },
          },
          {
            type: 'object',
            required: ['address', 'purpose'],
            additionalProperties: false,
            properties: {
              address: { $ref: '#/components/schemas/StellarAddress' },
              purpose: { type: 'string', const: 'login' },
            },
          },
        ],
      }),
      responses: {
        '201': jsonResponse('Challenge created.', {
          $ref: '#/components/schemas/WalletChallengeResult',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/wallet/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a wallet identity',
      description:
        'Submit the Base64 signature of a register challenge message. Returns a 30-day bearer token and sets a session cookie.',
      operationId: 'registerWallet',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['address', 'name', 'challengeId', 'signature'],
        properties: {
          address: { $ref: '#/components/schemas/StellarAddress' },
          name: { type: 'string', minLength: 2, maxLength: 80 },
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signature: {
            type: 'string',
            description: 'Base64-encoded Ed25519 signMessage signature.',
            maxLength: 200,
          },
        },
      }),
      responses: {
        '201': jsonResponse('Wallet registered.', {
          $ref: '#/components/schemas/WalletAuthResult',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/wallet/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Log in with a wallet signature',
      description:
        'A valid existing bearer token can be reused until expiry; request a new login challenge only when needed.',
      operationId: 'loginWallet',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['address', 'challengeId', 'signature'],
        properties: {
          address: { $ref: '#/components/schemas/StellarAddress' },
          challengeId: { $ref: '#/components/schemas/ObjectId' },
          signature: {
            type: 'string',
            description: 'Base64-encoded signMessage signature.',
            maxLength: 200,
          },
        },
      }),
      responses: {
        '200': jsonResponse('Wallet login successful.', {
          $ref: '#/components/schemas/WalletAuthResult',
        }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/auth/session': {
    get: {
      tags: ['Authentication'],
      summary: 'Inspect the current session',
      operationId: 'getSession',
      responses: {
        '200': jsonResponse('Active session.', { $ref: '#/components/schemas/SessionResult' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Unauthorized' },
      },
    },
    delete: {
      tags: ['Authentication'],
      summary: 'Revoke the current session',
      operationId: 'deleteSession',
      responses: {
        '200': jsonResponse('Session ended.', { $ref: '#/components/schemas/EmptyResult' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
} as const;

export default authPaths;
