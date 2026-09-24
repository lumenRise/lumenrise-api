const retryDelay = (failures: number): number =>
  Math.min(60_000 * 2 ** Math.max(0, failures - 1), 3_600_000);

export { retryDelay };
