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
      summary: 'List client-submitted successful curve trades',
      description:
        'Reads verified client-submitted direct buy/sell transactions, newest first with cursor pagination. Each item contains wallet, time, token, side, amount and average execution price before fees. Amounts and prices use 7 decimals.',
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
    post: {
      tags: ['Launches'],
      security: [],
      operationId: 'postLaunchTrade',
      summary: 'Verify a submitted trade hash and record the current contract price',
      description:
        'Requires the existing x-user-id session header. Only successful direct buy/sell calls on this launch are accepted. Retry the same hash on 202 or 503; completed submissions are idempotent. The sampled price is observed at read time and may include subsequent trades.',
      parameters: [...identity, { in: 'header', name: 'x-user-id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['transactionHash'],
              properties: { transactionHash: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' } },
            },
          },
        },
      },
      responses: {
        '200': jsonResponse('Trade recorded.', { $ref: '#/components/schemas/LaunchTradeSubmission' }),
        '202': { description: 'Transaction not available yet; retry the same hash after Retry-After seconds.' },
        '401': { description: 'Authentication required.' },
        '403': { description: 'Identity is not active.' },
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
        'Price is the latest recorded current_price contract response. 24-hour statistics cover verified client-submitted trades. This GET reads the database without making RPC calls.',
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
        'Candles use direct current_price observations after verified trades and every 10 minutes while polling is active. OHLC reflects observed samples. Empty buckets are omitted; carry the previous close forward using step interpolation. previousPrice supplies the price before the range. Prices are in the pair asset. At most 1000 candles.',
      parameters: [
        ...identity,
        {
          in: 'query',
          name: 'range',
          schema: { type: 'string', enum: ['1D', '1W', '1M', '3M', 'ALL'], default: '1D' },
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
