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
  '/v1/launches/{contractId}/holders': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getLaunchHolders',
      summary: 'List known trading wallets holding the launch token',
      description:
        'Reads token-contract balance snapshots refreshed asynchronously by the launch worker after verified client-submitted trades, highest balance first (address breaks ties). Zero balances remove the wallet. Balances are replaced, never accumulated. This is not a complete on-chain holder index: transfer-only recipients, creator allocations and trades not submitted to the API are not discovered; transfers after the last refresh can make a stored snapshot outdated. Re-submit a previously verified trade hash to refresh its trader. Pagination follows current balances and can change while wallets trade.',
      parameters: [
        ...identity,
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        { in: 'query', name: 'cursor', schema: { type: 'string', maxLength: 512 } },
      ],
      responses: {
        '200': jsonResponse('Holders retrieved.', {
          $ref: '#/components/schemas/LaunchHolderList',
        }),
        ...errors,
      },
    },
  },
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
      operationId: 'postLaunchTrade',
      summary: 'Verify a submitted trade hash and record the current contract price',
      description:
        'Requires the existing x-user-id session header. Only successful direct buy/sell calls on this launch are accepted. Retry the same hash on 202 or 503; trade records are idempotent. Every verified submission, including a repeated hash, queues a holder refresh through RabbitMQ for the launch worker. The worker replaces the balance from the token contract and removes zero balances. Retrying a completed hash queues another holder refresh without re-reading its price. Holder processing is asynchronous; trade success does not mean the balance snapshot has finished updating. The sampled price is observed at read time and may include subsequent trades.',
      parameters: identity,
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
        '200': jsonResponse('Trade recorded.', {
          $ref: '#/components/schemas/LaunchTradeSubmission',
        }),
        '202': {
          description:
            'Transaction not available yet; retry the same hash after Retry-After seconds.',
          headers: { 'Retry-After': { schema: { type: 'integer', minimum: 1 } } },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status', 'message', 'result'],
                properties: {
                  status: { const: 'pending' },
                  message: { type: 'string' },
                  result: { $ref: '#/components/schemas/EmptyResult' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
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
        'Without range, returns requested timeframes (default: 1h,1d,1w,1M,3M,6M,1y). Prices are seeded once after opening and updated after verified client-submitted trades; unchanged prices are not normally stored. Empty intervals carry the last known price forward. OHLC includes the price at the interval start. Current or query-truncated candles have close=null and latestPrice holds the last known value. Candles start at the configured launch time, using the initial curve price calculated from virtual reserves (rounded up at scale 7) until the first observation; partial marks candles with an unobserved opening history. UTC calendar months/years and Monday weeks. Up to limit latest candles per timeframe; when hasMore=true, request to=nextBefore for older candles of that timeframe. Explicit range retains the legacy response format and fills empty intervals from launch with the same initial curve price and carry-forward policy.',
      parameters: [
        ...identity,
        {
          in: 'query',
          name: 'timeframes',
          style: 'form',
          explode: false,
          schema: {
            type: 'array',
            minItems: 1,
            maxItems: 12,
            items: {
              type: 'string',
              enum: ['1m', '5m', '15m', '45m', '1h', '4h', '1d', '1w', '1M', '3M', '6M', '1y'],
            },
            default: ['1h', '1d', '1w', '1M', '3M', '6M', '1y'],
          },
        },
        {
          in: 'query',
          name: 'from',
          schema: { type: 'string', format: 'date-time' },
          description: 'Optional lower bound. Returns whole UTC candles intersecting the bound.',
        },
        {
          in: 'query',
          name: 'to',
          schema: { type: 'string', format: 'date-time' },
          description: 'Exclusive upper bound; defaults to now, cannot be in the future.',
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 1000, default: 1000 },
          description: 'Maximum latest candles per timeframe.',
        },
        {
          in: 'query',
          name: 'range',
          description: 'Legacy response mode, cannot be combined with timeframes/from/to/limit.',
          schema: { type: 'string', enum: ['1D', '1W', '1M', '3M', 'ALL'] },
        },
      ],
      responses: {
        '200': jsonResponse('Chart retrieved.', {
          oneOf: [
            { $ref: '#/components/schemas/LaunchTimeframeChart' },
            { $ref: '#/components/schemas/LaunchChart' },
          ],
        }),
        ...errors,
      },
    },
  },
} as const;

export default launchMarketPaths;
