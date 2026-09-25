import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import XDataSnapshot from '../../src/models/XDataSnapshot.js';
import GitHubDataSnapshot from '../../src/models/GitHubDataSnapshot.js';
import GitLabDataSnapshot from '../../src/models/GitLabDataSnapshot.js';
import getProviderEvidence from '../../src/utils/sybil/getProviderEvidence.js';

vi.mock('../../src/models/GitHubDataSnapshot.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../src/models/GitLabDataSnapshot.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../src/models/XDataSnapshot.js', () => ({ default: { findOne: vi.fn() } }));

describe('provider evidence ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['github', GitHubDataSnapshot],
    ['gitlab', GitLabDataSnapshot],
    ['x', XDataSnapshot],
  ] as const)('uses only snapshots for the current %s connection', async (provider, model) => {
    const identity = new Types.ObjectId();
    const accountId = new Types.ObjectId();
    const snapshotId = new Types.ObjectId();
    const collectedAt = new Date('2026-09-25T12:00:00.000Z');
    const account = { _id: accountId, identity, provider };

    vi.mocked(model.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        _id: snapshotId,
        status: 'complete',
        dataVersion: 'v1',
        collectedAt,
        coverage:
          provider === 'x'
            ? { profile: true, posts: true }
            : { profile: true, contributions: true },
        metrics: {
          accountAgeDays: 400,
          ...(provider === 'github' ? { allTimeCommits: 20 } : {}),
          ...(provider === 'gitlab' ? { pushedCommitCount: 30 } : {}),
        },
      }),
    } as never);

    const result = await getProviderEvidence(account as never);

    expect(model.findOne).toHaveBeenCalledWith({ identity, externalAccount: accountId });
    expect(result).toEqual({
      provider,
      snapshot: {
        id: snapshotId.toString(),
        status: 'complete',
        dataVersion: 'v1',
        collectedAt: collectedAt.toISOString(),
        profileCovered: true,
        activityCovered: provider !== 'x',
        accountAgeDays: 400,
        commitCount: provider === 'github' ? 20 : provider === 'gitlab' ? 30 : null,
      },
    });
  });

  it('reports missing evidence without reusing a previous account snapshot', async () => {
    vi.mocked(GitHubDataSnapshot.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never);

    const result = await getProviderEvidence({
      _id: new Types.ObjectId(),
      identity: new Types.ObjectId(),
      provider: 'github',
    } as never);

    expect(result).toEqual({ provider: 'github', snapshot: null });
  });
});
