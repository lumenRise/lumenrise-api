import jsonResponse from '../../utils/openapi/jsonResponse';

const configPaths = {
  '/v1/config': {
    get: {
      tags: ['System'],
      summary: 'Get public application configuration and client rules',
      description:
        'Available before login, without database or upstream requests. Returns both networks regardless of the selected network. Empty RPC, factory, or home-domain values indicate missing configuration; launchConfigured requires all three. Feature flags describe configuration, not live service health. All intervals use milliseconds; upload limits use bytes. User-specific cooldowns remain authoritative in resource responses and Retry-After headers. Contract-enforced launch economics are not defined by this API. Responses are not cached.',
      operationId: 'getPublicConfiguration',
      security: [],
      responses: {
        '200': jsonResponse('Public configuration and application rules.', {
          $ref: '#/components/schemas/PublicConfiguration',
        }),
      },
    },
  },
} as const;

export default configPaths;
