const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown synchronization error';

export { getErrorMessage };
