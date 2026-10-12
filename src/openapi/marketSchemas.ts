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
      description: 'Average execution price before creator fees, rounded up to 7 decimals, in the pair asset.',
    },
  },
};
const marketSchemas = {
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
        description: 'Last observed price before the requested range; carry it into empty intervals.',
      },
      interpolation: { const: 'step' },
      items: {
        type: 'array',
        maxItems: 1000,
        items: {
          type: 'object',
          required: ['timestamp', 'open', 'high', 'low', 'close', 'count', 'firstObservedAt', 'lastObservedAt'],
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
