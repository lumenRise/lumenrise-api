const parseExternalUserId = (value: unknown): string | null => {
  const text = typeof value === 'number' ? String(value) : value;

  if (typeof text !== 'string' || !/^[1-9]\d*$/.test(text)) {
    return null;
  }

  return Number.isSafeInteger(Number(text)) ? text : null;
};

export { parseExternalUserId };
