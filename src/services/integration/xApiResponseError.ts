class XApiResponseError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(status: number, operation: string, detail: string) {
    super(`X ${operation} failed with status ${status}: ${detail}`);
    this.name = 'XApiResponseError';
    this.status = status;
    this.retryable = status === 408 || status >= 500;
  }
}

export default XApiResponseError;
