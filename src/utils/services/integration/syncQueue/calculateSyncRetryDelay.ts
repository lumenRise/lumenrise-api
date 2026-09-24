const calculateSyncRetryDelay = (attempts: number): number =>
  Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);

export { calculateSyncRetryDelay };
