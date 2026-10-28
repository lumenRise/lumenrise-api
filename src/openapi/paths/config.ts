import jsonResponse from '../../utils/openapi/jsonResponse';

const configPaths = {
  '/v1/config': {
    get: {
      tags: ['System'],
      summary: 'Get public application configuration and client rules',
      description:
        "The default response includes Stellar configuration and a base object with public Privy and Base configuration. Send X-Chain: base to return the Base configuration directly. Base amounts use each token's native decimals, exposed per launch; Base rule scales are null because there is no universal scale. Available before login, without database or upstream requests. Returns both networks regardless of the selected network. Empty RPC, factory, or home-domain values indicate missing configuration; launchConfigured requires all three. Feature flags describe configuration, not live service health. All intervals use milliseconds; upload limits use bytes. User-specific cooldowns remain authoritative in resource responses and Retry-After headers. Contract-enforced launch economics are not defined by this API. Responses are not cached.",
      operationId: 'getPublicConfiguration',
      security: [],
      responses: {
        '200': jsonResponse('Public configuration and application rules.', {
          oneOf: [
            { $ref: '#/components/schemas/PublicConfiguration' },
            { $ref: '#/components/schemas/BasePublicConfiguration' },
          ],
        }),
      },
    },
  },
} as const;

export default configPaths;
