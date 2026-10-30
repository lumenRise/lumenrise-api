import jsonResponse from '../../utils/openapi/jsonResponse';

const bucket = {
  type: 'object',
  required: ['amount', 'tradeCount', 'buyCount', 'sellCount'],
  properties: {
    amount: {
      type: 'string',
      description: 'USDC in whole units as an exact decimal string, multiplied by 2.',
    },
    tradeCount: { type: 'integer', minimum: 0 },
    buyCount: { type: 'integer', minimum: 0 },
    sellCount: { type: 'integer', minimum: 0 },
  },
};

const statsPaths = {
  '/v1/stats/volume': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getProjectVolume',
      summary: 'Read total and trailing 24-hour USDC volume across Stellar and Base',
      description:
        'Combines all recorded buy and sell grossAmount values for the selected environment, independently of X-Chain. Normalizes native pair decimals before summing and multiplies volume amounts by 2. Trade counts are not multiplied. The 24-hour window includes its start and excludes future trades. This reports indexed trades, not an assertion of complete chain history. Use network=public for mainnet and network=testnet for testnet; environments are never combined.',
      parameters: [
        {
          in: 'query',
          name: 'network',
          schema: { type: 'string', enum: ['testnet', 'public'], default: 'testnet' },
        },
      ],
      responses: {
        '200': jsonResponse('Project volume retrieved.', {
          type: 'object',
          required: ['network', 'currency', 'multiplier', 'asOf', 'volumeTotal', 'volume24h'],
          properties: {
            network: { type: 'string', enum: ['testnet', 'public', 'all'] },
            currency: { type: 'string', enum: ['USDC'] },
            multiplier: { type: 'integer', enum: [2] },
            asOf: { type: 'string', format: 'date-time' },
            volumeTotal: bucket,
            volume24h: bucket,
          },
        }),
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
};

const allNetworkPaths = {
  '/v1/stats/volume/all': {
    get: {
      ...statsPaths['/v1/stats/volume'].get,
      operationId: 'getAllNetworksProjectVolume',
      summary: 'Read project-wide USDC volume across both chains and all environments',
      description:
        'Includes Stellar and Base, testnet and public together. Both total and trailing 24-hour amounts are normalized using each launch pair decimals and multiplied by 2 exactly once. Amounts are decimal strings in whole USDC units, not raw token units. No price oracle or USD conversion is applied; the application uses USDC as the payment token. Trade counts remain real. Valid chain and environment headers do not restrict this aggregate. network is all in the response.',
      parameters: [],
    },
  },
};

export default { ...statsPaths, ...allNetworkPaths };
