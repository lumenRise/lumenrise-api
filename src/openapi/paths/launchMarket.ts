import jsonResponse from '../../utils/openapi/jsonResponse';

const identity = [
  {
    in: 'path',
    name: 'contractId',
    required: true,
    schema: { type: 'string', pattern: '^C[A-Z2-7]{55}$' },
  },
  { in: 'query', name: 'network', schema: { type: 'string', enum: ['testnet', 'public'] } },
];
const errors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '404': { $ref: '#/components/responses/NotFound' },
  '503': { $ref: '#/components/responses/ServiceUnavailable' },
};

const launchMarketPaths = {
  '/v1/launches/{contractId}/trades': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getLaunchTrades',
      summary: 'List verified successful curve trades',
      description:
        'Reads indexed direct buy/sell calls. Newest first, cursor pagination. Amounts and prices are exact integers in 7-decimal pair/token units. Coverage is explicit; absent records do not prove no past trades.',
      parameters: [
        ...identity,
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        { in: 'query', name: 'cursor', schema: { type: 'string', maxLength: 512 } },
        { in: 'query', name: 'trader', schema: { type: 'string', pattern: '^G[A-Z2-7]{55}$' } },
        { in: 'query', name: 'side', schema: { type: 'string', enum: ['buy', 'sell'] } },
      ],
      responses: {
        '200': jsonResponse('Trades retrieved.', { $ref: '#/components/schemas/LaunchTradeList' }),
        ...errors,
      },
    },
  },
  '/v1/launches/{contractId}/market': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getLaunchMarket',
      summary: 'Read curve price and 24-hour trade statistics',
      description:
        'Marginal price is calculated from indexed state with contract rounding, before fees. Volume sums gross pair amounts for buys and sells. Partial coverage is flagged. Holders, circulating supply and external pool liquidity are unavailable, not zero. No request-time RPC calls.',
      parameters: identity,
      responses: {
        '200': jsonResponse('Market retrieved.', { $ref: '#/components/schemas/LaunchMarket' }),
        ...errors,
      },
    },
  },
  '/v1/launches/{contractId}/chart': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getLaunchChart',
      summary: 'Read curve price chart candles',
      description:
        'sampled uses minute observations of indexed marginal prices; execution uses successful trade prices excluding fees. OHLC reflects available observations, not unobserved extremes. Empty buckets are omitted; prices are in the pair asset, not USD. No fabricated backfill. At most 1000 buckets.',
      parameters: [
        ...identity,
        {
          in: 'query',
          name: 'range',
          schema: { type: 'string', enum: ['1D', '1W', '1M', '3M', 'ALL'], default: '1D' },
        },
        {
          in: 'query',
          name: 'kind',
          schema: { type: 'string', enum: ['sampled', 'execution'], default: 'sampled' },
        },
      ],
      responses: {
        '200': jsonResponse('Chart retrieved.', { $ref: '#/components/schemas/LaunchChart' }),
        ...errors,
      },
    },
  },
} as const;

export default launchMarketPaths;
