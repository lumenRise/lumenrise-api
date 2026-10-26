const parsePrivyUserId = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^did:privy:[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    return null;
  }

  return value;
};

export default parsePrivyUserId;
