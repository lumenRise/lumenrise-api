import statsScopes from '../../constants/stats/scopes';
import jsonResponse from '../../utils/openapi/jsonResponse';

const count = { type: 'integer', minimum: 0 };
const date = { type: 'string', format: 'date-time' };
const decimal = { type: 'string', pattern: '^\\d+(\\.\\d+)?$' };

const scopeProperties = {
  chain: { type: 'string', enum: ['stellar', 'base', 'all'] },
  network: { type: 'string', enum: ['testnet', 'public'] },
};

const trade = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'chain',
    'network',
    'launch',
    'trader',
    'tradedAt',
    'side',
    'assetAmount',
    'price',
    'amount',
  ],
  properties: {
    id: { type: 'string', description: 'Stable list item key.' },
    chain: { type: 'string', enum: ['stellar', 'base'] },
    network: scopeProperties.network,
    launch: {
      type: 'object',
      required: ['slug', 'name', 'symbol', 'logo'],
      properties: {
        slug: { type: 'string' },
        name: { type: 'string' },
        symbol: { type: 'string' },
        logo: { type: 'string' },
      },
    },
    trader: { type: 'string' },
    tradedAt: date,
    side: { type: 'string', enum: ['buy', 'sell'] },
    assetAmount: {
      ...decimal,
      description: 'Token quantity in whole token units, already decimal-normalized.',
    },
    price: {
      ...decimal,
      description: 'Average execution price before fees in whole USDC per token.',
    },
    amount: {
      ...decimal,
      description: 'Actual gross trade value in whole USDC. No volume multiplier is applied.',
    },
  },
};

const tradePage = {
  type: 'object',
  required: ['chain', 'network', 'asOf', 'items', 'hasMore', 'nextCursor'],
  properties: {
    ...scopeProperties,
    asOf: date,
    hasMore: { type: 'boolean' },
    nextCursor: { type: ['string', 'null'] },
    items: { type: 'array', maxItems: 100, items: trade },
  },
};

const chartGroup = {
  type: 'object',
  required: ['chain', 'network', 'items'],
  properties: {
    ...scopeProperties,
    items: {
      type: 'array',
      maxItems: 1000,
      items: {
        type: 'object',
        required: [
          'timestamp',
          'endsAt',
          'launchCount',
          'tradeCount',
          'buyCount',
          'sellCount',
          'volume',
          'participantCount',
        ],
        properties: {
          timestamp: date,
          endsAt: date,
          launchCount: {
            ...count,
            description:
              'Launches created during this bucket; launches with unknown creation time are excluded.',
          },
          tradeCount: count,
          buyCount: count,
          sellCount: count,
          volume: {
            ...decimal,
            description: 'Whole-USDC buy plus sell gross volume, multiplied by 2 exactly once.',
          },
          participantCount: {
            ...count,
            description:
              'Unique chain-qualified trading wallets within this bucket, not current holders or new registrations.',
          },
        },
      },
    },
  },
};

const errors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '503': { $ref: '#/components/responses/ServiceUnavailable' },
};

const statsActivityPaths = {
  '/v1/stats/trades': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getStatsTrades',
      summary: 'List display-ready trades in four chain scopes and two combined scopes',
      description:
        'Returns chains (Stellar/Base testnet/public) and combined (both chains testnet/public). public means mainnet. Valid chain/network headers do not restrict these scopes. Each group has independent newest-first cursor pagination ordered by tradedAt and a unique ID. limit applies per group. Pass a group nextCursor in its corresponding cursor query parameter; omit it to read that group from the beginning. Cursors are scope-bound and retain their original asOf upper time bound. This is a live indexed feed, not a frozen database snapshot: late-ingested historical trades may appear on later pages. Empty groups have items=[], hasMore=false and nextCursor=null. Values are exact decimal strings in whole display units, with no multiplier applied. Only launch display metadata, trading wallet, time, side, quantity, price, gross amount and a stable list key are returned. No transaction hashes, ledgers, raw base units or token decimal scales. Reflects indexed history only.',
      parameters: [
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        ...statsScopes.map((scope) => ({
          in: 'query',
          name: scope.cursorKey,
          description: `Continuation cursor for ${scope.chain} ${scope.network}.`,
          schema: { type: 'string', maxLength: 512 },
        })),
      ],
      responses: {
        '200': jsonResponse('Statistics trades retrieved.', {
          type: 'object',
          required: ['currency', 'limit', 'chains', 'combined'],
          properties: {
            currency: { type: 'string', enum: ['USDC'] },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            chains: { type: 'array', minItems: 4, maxItems: 4, items: tradePage },
            combined: { type: 'array', minItems: 2, maxItems: 2, items: tradePage },
          },
        }),
        ...errors,
      },
    },
  },
  '/v1/stats/chart': {
    get: {
      tags: ['Launches'],
      security: [],
      operationId: 'getStatsChart',
      summary: 'Read launch, trade, volume and participant trends in six scopes',
      description:
        'Returns four chain groups and two combined groups, with ascending, zero-filled time buckets. public means mainnet. All metrics represent activity within each bucket, not cumulative totals. Default range is the 30 days before to; to defaults to now. from is inclusive and to is exclusive, with no future end. Maximum range is 366 days and maximum bucket count is 1000 per group. Buckets follow UTC hours, days or Monday-start weeks. First and last buckets are clipped to the requested range. volume uses exact normalized USDC amounts and the same x2 multiplier as market statistics; counts are not multiplied. Participants are distinct trading wallets per bucket, deduplicated across launches; Base addresses are case-insensitive, and different chains remain distinct. Participant counts must not be summed to obtain unique participants for the whole range. Launches with unknown createdAt cannot contribute to launchCount. Valid chain/network headers do not restrict the groups. Coverage is indexed launch and trade history; site visits and other website activity are not tracked by this endpoint.',
      parameters: [
        {
          in: 'query',
          name: 'interval',
          schema: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' },
        },
        { in: 'query', name: 'from', schema: date },
        { in: 'query', name: 'to', schema: date },
      ],
      responses: {
        '200': jsonResponse('Statistics chart retrieved.', {
          type: 'object',
          required: [
            'currency',
            'multiplier',
            'asOf',
            'from',
            'to',
            'interval',
            'timezone',
            'chains',
            'combined',
          ],
          properties: {
            currency: { type: 'string', enum: ['USDC'] },
            multiplier: { type: 'integer', enum: [2] },
            asOf: date,
            from: date,
            to: date,
            interval: { type: 'string', enum: ['hour', 'day', 'week'] },
            timezone: { type: 'string', enum: ['UTC'] },
            chains: { type: 'array', minItems: 4, maxItems: 4, items: chartGroup },
            combined: { type: 'array', minItems: 2, maxItems: 2, items: chartGroup },
          },
        }),
        ...errors,
      },
    },
  },
};

export default statsActivityPaths;
