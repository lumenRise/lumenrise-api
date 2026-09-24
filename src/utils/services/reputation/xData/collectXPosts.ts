import { getXTimelineUrl } from './getXTimelineUrl.js';
import XRateLimitError from '../../../../services/integration/xRateLimit.js';
import type { XPost, XTimelineResponse } from '../../../../types/reputation/x.js';
import XApiResponseError from '../../../../services/integration/xApiResponseError.js';

const collectXPosts = async (userId: string, accessToken: string): Promise<XPost[]> => {
  const posts: XPost[] = [];
  const observedPaginationTokens = new Set<string>();

  let paginationToken: string | undefined;

  do {
    const response = await fetch(getXTimelineUrl(userId, paginationToken), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      throw new XRateLimitError(response);
    }

    const result = (await response.json()) as XTimelineResponse;

    if (!response.ok) {
      throw new XApiResponseError(
        response.status,
        'timeline request',
        result.errors?.[0]?.detail ??
          result.errors?.[0]?.title ??
          result.detail ??
          result.title ??
          'Unknown X API error',
      );
    }

    posts.push(...(result.data ?? []));

    const nextToken = result.meta?.next_token;

    if (!nextToken) {
      paginationToken = undefined;
      continue;
    }

    if (observedPaginationTokens.has(nextToken)) {
      throw new Error('X timeline returned a repeated pagination token');
    }

    observedPaginationTokens.add(nextToken);
    paginationToken = nextToken;
  } while (paginationToken);

  return posts;
};

export { collectXPosts };
