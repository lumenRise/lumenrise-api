const amount = {
  type: 'string',
  pattern: '^\\d+$',
  description: 'Exact integer with 7 decimal places; divide by 10^7 for display.',
};
const nullableDate = { type: ['string', 'null'], format: 'date-time' };
const date = { type: 'string', format: 'date-time' };
const nullableAmount = { oneOf: [amount, { type: 'null' }] };
const network = { type: 'string', enum: ['testnet', 'public'] };
const contract = { type: 'string', pattern: '^C[A-Z2-7]{55}$' };
const count = { type: 'integer', minimum: 0 };
const coverage = {
  type: 'object',
  properties: {
    source: { type: 'string', const: 'successful_direct_curve_calls' },
    historyComplete: { type: 'boolean', const: false },
    coverageFrom: nullableDate,
    scannedThroughLedger: { type: ['integer', 'null'] },
    scannedAt: nullableDate,
    stale: { type: 'boolean' },
    caughtUp: { type: 'boolean' },
    historyGap: { type: 'boolean' },
    unclassifiedCount: count,
  },
};

const marketSchemas = {
  LaunchTradeCoverage: coverage,
  LaunchTradeList: {
    type: 'object',
    required: ['items', 'nextCursor', 'amountScale', 'priceScale', 'coverage'],
    properties: {
      nextCursor: { type: ['string', 'null'] },
      amountScale: { const: 7 },
      priceScale: { const: 7 },
      coverage: { $ref: '#/components/schemas/LaunchTradeCoverage' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: [
            'network',
            'contractId',
            'transactionHash',
            'operationIndex',
            'transactionIndex',
            'ledger',
            'tradedAt',
            'trader',
            'side',
            'assetAmount',
            'grossAmount',
            'creatorFee',
            'userAmount',
            'executionPrice',
          ],
          properties: {
            network,
            contractId: contract,
            transactionHash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
            operationIndex: count,
            transactionIndex: count,
            ledger: count,
            tradedAt: date,
            trader: { type: 'string' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            assetAmount: amount,
            grossAmount: amount,
            creatorFee: amount,
            userAmount: amount,
            executionPrice: amount,
          },
        },
      },
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
      priceType: { const: 'marginal_before_fee' },
      stateAsOfLedger: count,
      stateObservedAt: date,
      stateStale: { type: 'boolean' },
      curveReserve: amount,
      netTokensSold: amount,
      distinctBuyers: count,
      volume24h: {
        oneOf: [
          { type: 'null' },
          {
            type: 'object',
            properties: {
              grossPairAmount: amount,
              assetAmount: amount,
              creatorFees: amount,
              tradeCount: count,
              buyCount: count,
              sellCount: count,
              partial: { type: 'boolean' },
            },
          },
        ],
      },
      holders: { type: 'null' },
      circulatingSupply: { type: 'null' },
      poolLiquidity: { type: 'null' },
      unavailable: { type: 'object', additionalProperties: { type: 'string' } },
      coverage: { $ref: '#/components/schemas/LaunchTradeCoverage' },
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
      'kind',
      'intervalSeconds',
      'priceScale',
      'priceType',
      'firstObservationAt',
      'items',
      'coverage',
    ],
    properties: {
      network,
      contractId: contract,
      asset: contract,
      pair: contract,
      range: { type: 'string', enum: ['1D', '1W', '1M', '3M', 'ALL'] },
      kind: { type: 'string', enum: ['sampled', 'execution'] },
      intervalSeconds: { type: 'integer', minimum: 1 },
      amountScale: { const: 7 },
      priceScale: { const: 7 },
      priceType: { type: 'string', enum: ['observed_marginal_before_fee', 'execution_before_fee'] },
      firstObservationAt: nullableDate,
      lastObservationAt: nullableDate,
      emptyBuckets: { const: 'omitted' },
      historyComplete: { const: false },
      coverage: {
        oneOf: [
          { $ref: '#/components/schemas/LaunchTradeCoverage' },
          {
            type: 'object',
            properties: {
              source: { const: 'indexed_state_samples' },
              coverageFrom: nullableDate,
              stale: { type: 'boolean' },
              note: { type: 'string' },
            },
          },
        ],
      },
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
            'grossVolume',
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
            grossVolume: nullableAmount,
            firstObservedAt: date,
            lastObservedAt: date,
          },
        },
      },
    },
  },
};

export default marketSchemas;
