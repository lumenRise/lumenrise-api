const amount = {
  type: 'string',
  pattern: '^\\d+$',
  description: 'Exact integer scaled by 10^7; divide by 10^7 for display.',
};
const date = { type: 'string', format: 'date-time' };
const nullableDate = { type: ['string', 'null'], format: 'date-time' };
const nullableAmount = { oneOf: [amount, { type: 'null' }] };
const contract = { type: 'string', pattern: '^C[A-Z2-7]{55}$' };
const count = { type: 'integer', minimum: 0 };
const network = { type: 'string', enum: ['testnet', 'public'] };
const trade = {
  type: 'object',
  required: ['trader', 'tradedAt', 'asset', 'side', 'assetAmount', 'executionPrice'],
  additionalProperties: false,
  properties: {
    trader: { type: 'string' },
    tradedAt: date,
    asset: contract,
    side: { type: 'string', enum: ['buy', 'sell'] },
    assetAmount: amount,
    executionPrice: {
      ...amount,
      description:
        'Average execution price before creator fees, rounded up to 7 decimals, in the pair asset.',
    },
  },
};
const marketSchemas = {
  LaunchHolderList: {
    type: 'object',
    required: [
      'network',
      'contractId',
      'asset',
      'amountScale',
      'balanceSource',
      'coverage',
      'totalHolders',
      'nextCursor',
      'items',
    ],
    properties: {
      network,
      contractId: contract,
      asset: contract,
      amountScale: { const: 7 },
      balanceSource: { const: 'token_contract' },
      coverage: { const: 'trade_participants' },
      totalHolders: count,
      nextCursor: { type: ['string', 'null'] },
      items: {
        type: 'array',
        maxItems: 100,
        items: {
          type: 'object',
          required: ['address', 'balance', 'observedAt'],
          additionalProperties: false,
          properties: {
            address: { type: 'string', pattern: '^[GC][A-Z2-7]{55}$' },
            balance: amount,
            observedAt: date,
          },
        },
      },
    },
  },
  LaunchTrade: trade,
  LaunchTradeSubmission: {
    type: 'object',
    required: ['trade', 'pair', 'amountScale', 'priceScale'],
    properties: { trade, pair: contract, amountScale: { const: 7 }, priceScale: { const: 7 } },
  },
  LaunchTradeList: {
    type: 'object',
    required: ['items', 'nextCursor', 'pair', 'amountScale', 'priceScale'],
    properties: {
      items: { type: 'array', items: trade },
      nextCursor: { type: ['string', 'null'] },
      pair: contract,
      amountScale: { const: 7 },
      priceScale: { const: 7 },
    },
  },
  LaunchMarket: {
    type: 'object',
    properties: {
      network,
      contractId: contract,
      asset: contract,
      pair: contract,
      amountScale: { const: 7 },
      priceScale: { const: 7 },
      currentPrice: nullableAmount,
      priceObservedAt: nullableDate,
      priceType: { const: 'marginal_before_fee' },
      stateAsOfLedger: count,
      stateObservedAt: date,
      stateStale: { type: 'boolean' },
      curveReserve: amount,
      netTokensSold: amount,
      distinctBuyers: count,
      volume24h: {
        type: 'object',
        description: 'Verified transactions submitted by this client, not all network activity.',
        properties: {
          grossPairAmount: amount,
          assetAmount: amount,
          tradeCount: count,
          buyCount: count,
          sellCount: count,
        },
      },
    },
  },
  LaunchTimeframeChart: {
    type: 'object',
    required: [
      'network',
      'contractId',
      'asset',
      'pair',
      'priceScale',
      'amountScale',
      'priceType',
      'asOf',
      'firstObservationAt',
      'lastObservationAt',
      'timeframes',
    ],
    properties: {
      network,
      contractId: contract,
      asset: contract,
      pair: contract,
      amountScale: { const: 7 },
      priceScale: { const: 7 },
      priceType: { const: 'marginal_before_fee' },
      asOf: date,
      firstObservationAt: nullableDate,
      lastObservationAt: nullableDate,
      timeframes: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          required: ['timeframe', 'timezone', 'items', 'hasMore', 'nextBefore'],
          properties: {
            timeframe: {
              type: 'string',
              enum: ['1m', '5m', '15m', '45m', '1h', '4h', '1d', '1w', '1M', '3M', '6M', '1y'],
            },
            timezone: { const: 'UTC' },
            hasMore: { type: 'boolean' },
            nextBefore: nullableDate,
            items: {
              type: 'array',
              maxItems: 1000,
              items: {
                type: 'object',
                required: [
                  'timestamp',
                  'endsAt',
                  'open',
                  'high',
                  'low',
                  'close',
                  'latestPrice',
                  'complete',
                  'partial',
                  'count',
                  'firstObservedAt',
                  'lastObservedAt',
                ],
                properties: {
                  timestamp: date,
                  endsAt: date,
                  open: amount,
                  high: amount,
                  low: amount,
                  close: nullableAmount,
                  latestPrice: amount,
                  complete: { type: 'boolean' },
                  partial: {
                    type: 'boolean',
                    description:
                      'The first known observation is after the candle start; earlier prices are unknown.',
                  },
                  count: {
                    ...count,
                    description:
                      'Number of stored price observations in this candle, not trade count.',
                  },
                  firstObservedAt: nullableDate,
                  lastObservedAt: nullableDate,
                },
              },
            },
          },
        },
      },
    },
  },
  LaunchChart: {
    type: 'object',
    required: [
      'network',
      'contractId',
      'asset',
      'pair',
      'range',
      'intervalSeconds',
      'priceScale',
      'priceType',
      'items',
      'previousPrice',
      'interpolation',
    ],
    properties: {
      network,
      contractId: contract,
      asset: contract,
      pair: contract,
      range: { type: 'string', enum: ['1D', '1W', '1M', '3M', 'ALL'] },
      intervalSeconds: { type: 'integer', minimum: 1 },
      amountScale: { const: 7 },
      priceScale: { const: 7 },
      priceType: { const: 'marginal_before_fee' },
      firstObservationAt: nullableDate,
      lastObservationAt: nullableDate,
      previousPrice: {
        ...nullableAmount,
        description:
          'Last observed price before the requested range; carry it into empty intervals.',
      },
      interpolation: { const: 'step' },
      items: {
        type: 'array',
        maxItems: 1000,
        items: {
          type: 'object',
          required: [
            'timestamp',
            'open',
            'high',
            'low',
            'close',
            'count',
            'firstObservedAt',
            'lastObservedAt',
          ],
          properties: {
            timestamp: date,
            open: amount,
            high: amount,
            low: amount,
            close: amount,
            count,
            firstObservedAt: date,
            lastObservedAt: date,
          },
        },
      },
    },
  },
};
export default marketSchemas;
