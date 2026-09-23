class XRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(response: Response, now = Date.now()) {
    super('X API rate limit reached');
    this.name = 'XRateLimitError';

    const resetSeconds = Number(response.headers.get('x-rate-limit-reset'));
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const resetDelay = Math.ceil((resetSeconds * 1_000 - now) / 1_000) + 1;

    if (Number.isFinite(resetSeconds) && resetSeconds > 0 && resetDelay > 0) {
      this.retryAfterSeconds = resetDelay;
    } else if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      this.retryAfterSeconds = Math.ceil(retryAfterSeconds);
    } else {
      this.retryAfterSeconds = 60;
    }
  }
}

export default XRateLimitError;
