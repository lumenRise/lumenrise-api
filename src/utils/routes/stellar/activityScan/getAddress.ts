const getAddress = (value: unknown): string =>
  typeof value === 'string' ? value.toUpperCase() : '';

export { getAddress };
