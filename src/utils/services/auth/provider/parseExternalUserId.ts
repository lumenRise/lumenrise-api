const parseExternalUserId = (value: unknown): string | null => {
  const text = typeof value === 'number' ? String(value) : value;

  if (typeof text !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(text)) {
    return null;
  }

  if (/^\d+$/.test(text)) {
    return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? text : null;
  }

  return text;
};

export { parseExternalUserId };
