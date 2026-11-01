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

const marketLaunch = {
  type: 'object',
  required: ['chain', 'network', 'contractId', 'slug', 'volumeTotal', 'participantCount'],
  properties: {
    chain: { type: 'string', enum: ['stellar', 'base'] },
    network: { type: 'string', enum: ['testnet', 'public'] },
    contractId: { type: 'string' },
    slug: { type: 'string' },
    volumeTotal: bucket,
    participantCount: { type: 'integer', minimum: 0 },
  },
};

const marketGroup = {
  type: 'object',
  required: [
    'chain',
    'network',
    'volumeTotal',
    'launchCount',
    'participantCount',
    'userCount',
    'launches',
  ],
  properties: {
    chain: { type: 'string', enum: ['stellar', 'base', 'all'] },
    network: { type: 'string', enum: ['testnet', 'public'] },
    volumeTotal: bucket,
    launchCount: { type: 'integer', minimum: 0 },
    participantCount: { type: 'integer', minimum: 0 },
    userCount: { type: 'integer', minimum: 0 },
    launches: { type: 'array', items: marketLaunch },
  },
};

const statsPaths = {
  '/v1/stats/market': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getMarketStats',
      summary: 'Read launch and market statistics for four chain scopes and two cross-chain scopes',
      description:
        'Always returns Stellar testnet, Base testnet, Stellar public and Base public in chains, and the cross-chain testnet and public totals in combined. public means mainnet. Valid chain and network headers do not restrict these groups. Each group includes every indexed launch with its own volumeTotal and participantCount, plus group totals, launchCount and userCount. Amounts are exact whole-USDC decimal strings: sum of nonnegative buy and sell grossAmount values, normalized by launch pair decimals and multiplied by 2 exactly once. Trade counts include buys and sells without multiplication. Participants are distinct trading wallets, deduplicated across launches within each group; Base addresses are case-insensitive. Combined groups count chain-qualified wallets separately, without claiming to identify the same person across chains. Users are globally active, non-deleted registered identities, independent of chain or network, and are repeated without doubling in every group. Launches without trades are included with zero statistics. Future trades are excluded. Statistics reflect indexed history, not guaranteed complete on-chain history.',
      responses: {
        '200': jsonResponse('Market statistics retrieved.', {
          type: 'object',
          required: ['currency', 'multiplier', 'asOf', 'userCountScope', 'chains', 'combined'],
          properties: {
            currency: { type: 'string', enum: ['USDC'] },
            multiplier: { type: 'integer', enum: [2] },
            asOf: { type: 'string', format: 'date-time' },
            userCountScope: { type: 'string', enum: ['global_active_identities'] },
            chains: { type: 'array', minItems: 4, maxItems: 4, items: marketGroup },
            combined: { type: 'array', minItems: 2, maxItems: 2, items: marketGroup },
          },
        }),
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
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
