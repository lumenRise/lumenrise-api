const chartTimeframes = {
  '1m': { unit: 'minute', binSize: 1 },
  '5m': { unit: 'minute', binSize: 5 },
  '15m': { unit: 'minute', binSize: 15 },
  '45m': { unit: 'minute', binSize: 45 },
  '1h': { unit: 'hour', binSize: 1 },
  '4h': { unit: 'hour', binSize: 4 },
  '1d': { unit: 'day', binSize: 1 },
  '1w': { unit: 'week', binSize: 1 },
  '1M': { unit: 'month', binSize: 1 },
  '3M': { unit: 'month', binSize: 3 },
  '6M': { unit: 'month', binSize: 6 },
  '1y': { unit: 'year', binSize: 1 },
} as const;

const defaultTimeframes = ['1h', '1d', '1w', '1M', '3M', '6M', '1y'] as const;

export { chartTimeframes, defaultTimeframes };
