const parseAddress = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';

export { parseAddress };
