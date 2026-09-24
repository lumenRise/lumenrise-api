const getNextPageUrl = (response: Response): string | null => {
  const link = response.headers.get('link');

  if (link) {
    for (const entry of link.split(',')) {
      const match = entry.match(/<([^>]+)>;\s*rel="next"/);

      if (match?.[1]) {
        return match[1];
      }
    }
  }

  const nextPage = response.headers.get('x-next-page');

  if (!nextPage) {
    return null;
  }

  const nextUrl = new URL(response.url);

  nextUrl.searchParams.set('page', nextPage);

  return nextUrl.toString();
};

export { getNextPageUrl };
