const getRetryAfterSeconds = (availableAt: Date, now = new Date()): number =>
  Math.max(1, Math.ceil((availableAt.getTime() - now.getTime()) / 1_000));

export { getRetryAfterSeconds };
