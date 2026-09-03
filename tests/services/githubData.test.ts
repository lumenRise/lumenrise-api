import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectAllRepositories,
  createContributionRanges,
} from '../../src/services/reputation/githubData.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHub data collection', () => {
  it('creates an uncapped yearly history plus recent activity windows', () => {
    const ranges = createContributionRanges(
      new Date('2008-01-01T00:00:00.000Z'),
      new Date('2026-09-22T00:00:00.000Z'),
    );

    expect(ranges.filter((range) => range.key.startsWith('year_'))).toHaveLength(19);
    expect(ranges.slice(-3).map((range) => range.key)).toEqual([
      'last_30_days',
      'last_90_days',
      'last_365_days',
    ]);
  });

  it('continues repository pagination until GitHub reports the final page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: {
              repositories: {
                nodes: [{ databaseId: 1 }],
                pageInfo: { hasNextPage: true, endCursor: 'next-page' },
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: {
              repositories: {
                nodes: [{ databaseId: 2 }],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const repositories = await collectAllRepositories('octocat', 'token');

    expect(repositories.map((repository) => repository.databaseId)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toContain('next-page');
  });
});
