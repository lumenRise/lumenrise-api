const parseUrl = (value: string, name: string): URL => {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
};

export { parseUrl };
