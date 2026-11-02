const parseClientOrigins = (value: string): string[] => {
  const origins: string[] = [];

  for (const entry of value.split(',')) {
    const origin = entry.trim();

    if (!origin) {
      continue;
    }

    const url = new URL(origin);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('CLIENT_ORIGIN must contain comma-separated HTTP or HTTPS origins');
    }

    origins.push(url.origin);
  }

  if (origins.length === 0) {
    throw new Error('CLIENT_ORIGIN must contain at least one origin');
  }

  return origins;
};

export default parseClientOrigins;
