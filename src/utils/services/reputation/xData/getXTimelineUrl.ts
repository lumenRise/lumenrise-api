import { X_TIMELINE_PAGE_SIZE } from '../../../../constants/services/reputation/xData.js';

const getXTimelineUrl = (userId: string, paginationToken?: string): URL => {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);

  url.searchParams.set('max_results', X_TIMELINE_PAGE_SIZE.toString());
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,referenced_tweets');

  if (paginationToken) {
    url.searchParams.set('pagination_token', paginationToken);
  }

  return url;
};

export { getXTimelineUrl };
