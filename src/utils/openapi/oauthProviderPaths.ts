import jsonResponse from './jsonResponse';

const oauthProviderPaths = (provider: string, displayName: string) => ({
  [`/v1/oauth/${provider}/connect`]: {
    get: {
      tags: ['Connections'],
      summary: `Start ${displayName} account connection`,
      description:
        'Requires an active registered identity selected by x-user-id. Use authorizationUrl in the same browser so the OAuth state cookie reaches the callback.',
      operationId: `connect${displayName}`,
      responses: {
        '200': jsonResponse(`${displayName} connection started.`, {
          type: 'object',
          required: ['authorizationUrl'],
          properties: { authorizationUrl: { type: 'string', format: 'uri' } },
        }),
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  [`/v1/oauth/${provider}/callback`]: {
    get: {
      tags: ['Connections'],
      summary: `Complete ${displayName} OAuth callback`,
      description:
        provider === 'x'
          ? 'Verifies the state cookie, connects X and stores OAuth credentials, then redirects with provider, status and username. Does not queue synchronization or calculate a score. Request POST /v1/connections/x/sync explicitly when ready.'
          : 'Provider redirect endpoint. Verifies the state cookie, connects the account, queues an initial sync, then redirects the browser to the client onboarding page with provider, status, username and syncJobId query parameters as available. It also redirects on failure.',
      operationId: `callback${displayName}`,
      security: [],
      parameters: [
        {
          in: 'query',
          name: 'code',
          schema: { type: 'string' },
          description: 'Authorization code on success.',
        },
        {
          in: 'query',
          name: 'state',
          schema: { type: 'string' },
          description: 'Must match the state stored in the browser cookie.',
        },
        {
          in: 'query',
          name: 'error',
          schema: { type: 'string' },
          description: 'Provider denial or error.',
        },
      ],
      responses: {
        '302': {
          description: 'Redirect to the client onboarding page.',
          headers: { Location: { schema: { type: 'string', format: 'uri' } } },
        },
      },
    },
  },
  [`/v1/oauth/${provider}/start`]: {
    get: {
      tags: ['Connections'],
      summary: `Deprecated ${displayName} registration route`,
      description:
        'Secondary providers cannot register a Lumenrise identity. Register the Auth provider user through /v1/auth/register first, then use /connect.',
      operationId: `deprecated${displayName}Start`,
      security: [],
      deprecated: true,
      responses: {
        '410': {
          description: 'Wallet registration is required.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },
});

export default oauthProviderPaths;
