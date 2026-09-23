import { afterEach, describe, expect, it, vi } from 'vitest';

import type { XPost } from '../../src/types/reputation/x.js';
import type { XUser } from '../../src/types/integration/x.js';
import { buildXMetrics, collectXPosts } from '../../src/services/reputation/xData.js';

const user: XUser = {
  id: '42',
  name: 'Developer',
  username: 'developer',
  created_at: '2020-01-01T00:00:00.000Z',
  public_metrics: {
    followers_count: 30,
    following_count: 10,
    tweet_count: 50,
    listed_count: 2,
    like_count: 7,
    media_count: 4,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('X data collection', () => {
  it('follows every timeline pagination token without an internal item cap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: '1', created_at: '2026-09-20T00:00:00.000Z' }],
            meta: { result_count: 1, next_token: 'next-page' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: '2', created_at: '2026-09-21T00:00:00.000Z' }],
            meta: { result_count: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const posts = await collectXPosts('42', 'access-token');
    const firstUrl = new URL(fetchMock.mock.calls[0]?.[0]);
    const secondUrl = new URL(fetchMock.mock.calls[1]?.[0]);

    expect(posts.map((post) => post.id)).toEqual(['1', '2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(firstUrl.searchParams.get('max_results')).toBe('100');
    expect(firstUrl.searchParams.get('tweet.fields')).toBe(
      'created_at,public_metrics,referenced_tweets',
    );
    expect(secondUrl.searchParams.get('pagination_token')).toBe('next-page');
  });

  it('builds aggregate metrics without retaining post content', () => {
    const posts: XPost[] = [
      {
        id: '1',
        created_at: '2026-09-20T10:00:00.000Z',
        public_metrics: {
          retweet_count: 2,
          reply_count: 3,
          like_count: 5,
          quote_count: 1,
          bookmark_count: 4,
          impression_count: 100,
        },
      },
      {
        id: '2',
        created_at: '2026-09-20T12:00:00.000Z',
        referenced_tweets: [{ type: 'replied_to', id: '100' }],
        public_metrics: {
          retweet_count: 1,
          reply_count: 1,
          like_count: 2,
          quote_count: 0,
        },
      },
      {
        id: '3',
        created_at: '2026-09-21T12:00:00.000Z',
        referenced_tweets: [{ type: 'retweeted', id: '101' }],
      },
      {
        id: '4',
        created_at: '2026-09-22T12:00:00.000Z',
        referenced_tweets: [{ type: 'quoted', id: '102' }],
      },
    ];
    const metrics = buildXMetrics(user, posts, new Date('2026-09-23T00:00:00.000Z'));

    expect(metrics.collectedPostCount).toBe(4);
    expect(metrics.originalPostCount).toBe(1);
    expect(metrics.replyPostCount).toBe(1);
    expect(metrics.repostCount).toBe(1);
    expect(metrics.quotePostCount).toBe(1);
    expect(metrics.activeDayCount).toBe(3);
    expect(metrics.receivedLikeCount).toBe(7);
    expect(metrics.receivedBookmarkCount).toBe(4);
    expect(metrics.impressionCount).toBe(100);
  });
});
