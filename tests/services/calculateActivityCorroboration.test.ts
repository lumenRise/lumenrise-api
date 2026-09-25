import { describe, expect, it } from 'vitest';

import type { SybilProviderEvidence } from '../../src/types/sybil/evidence.js';
import type { ReputationProfileResult } from '../../src/types/reputation/profile.js';
import calculateActivityCorroboration from '../../src/utils/sybil/calculateActivityCorroboration.js';

const now = new Date('2026-09-26T12:00:00.000Z');
const scanId = '507f1f77bcf86cd799439013';
const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const profile = {
  identity: { primaryWalletAddress: address },
  stellar: {
    address,
    ownershipVerified: true,
    scan: {
      id: scanId,
      address,
      status: 'completed',
      availableHistoryScanned: true,
      completedAt: '2026-09-25T12:00:00.000Z',
      summary: { activeDayCount: 12, initiatedOperationCount: 40 },
    },
    score: { scanId },
  },
} as ReputationProfileResult;
const providers: SybilProviderEvidence[] = [
  {
    provider: 'github',
    snapshot: {
      id: '507f1f77bcf86cd799439011',
      status: 'complete',
      dataVersion: 'github-v1',
      collectedAt: '2026-09-25T12:00:00.000Z',
      profileCovered: true,
      activityCovered: true,
      accountAgeDays: 730,
      commitCount: 150,
    },
  },
  {
    provider: 'gitlab',
    snapshot: {
      id: '507f1f77bcf86cd799439012',
      status: 'complete',
      dataVersion: 'gitlab-v1',
      collectedAt: '2026-09-25T12:00:00.000Z',
      profileCovered: true,
      activityCovered: true,
      accountAgeDays: 365,
      commitCount: 60,
    },
  },
];

describe('cross-source activity corroboration', () => {
  it('scores only fresh complete GitHub, GitLab and owner-linked Stellar activity with source provenance', () => {
    const result = calculateActivityCorroboration(profile, providers, now);

    expect(result).toMatchObject({
      algorithmVersion: 'activity-corroboration-v1',
      status: 'available',
      missingSources: [],
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.signals).toEqual([
      expect.objectContaining({ source: 'github', key: 'account_age_days', rawValue: 730 }),
      expect.objectContaining({ source: 'github', key: 'commits', rawValue: 150 }),
      expect.objectContaining({ source: 'gitlab', key: 'account_age_days', rawValue: 365 }),
      expect.objectContaining({ source: 'gitlab', key: 'commits', rawValue: 60 }),
      expect.objectContaining({ source: 'stellar', key: 'active_days', sourceId: scanId }),
      expect.objectContaining({ source: 'stellar', key: 'initiated_operations', sourceId: scanId }),
    ]);
  });

  it('does not convert missing, partial or stale inputs to zeroes or reweight the rest', () => {
    const result = calculateActivityCorroboration(
      { ...profile, stellar: { ...profile.stellar!, score: null } },
      [
        { ...providers[0], snapshot: { ...providers[0].snapshot!, status: 'partial' } },
        {
          ...providers[1],
          snapshot: {
            ...providers[1].snapshot!,
            collectedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      ],
      now,
    );
    expect(result).toMatchObject({
      status: 'insufficient_data',
      score: null,
      missingSources: ['github', 'gitlab', 'stellar'],
      signals: [],
    });
  });

  it('rejects unrelated or unverified scans and future-dated provider snapshots', () => {
    const result = calculateActivityCorroboration(
      {
        ...profile,
        stellar: {
          ...profile.stellar!,
          scan: { ...profile.stellar!.scan!, id: 'another-scan' },
        },
      },
      [
        {
          ...providers[0],
          snapshot: { ...providers[0].snapshot!, collectedAt: '2026-09-27T00:00:00.000Z' },
        },
        providers[1],
      ],
      now,
    );
    expect(result).toMatchObject({
      score: null,
      missingSources: ['github', 'stellar'],
    });
  });

  it('returns zero only when all three fresh sources really report zero activity and age', () => {
    const result = calculateActivityCorroboration(
      {
        ...profile,
        stellar: {
          ...profile.stellar!,
          scan: {
            ...profile.stellar!.scan!,
            summary: { activeDayCount: 0, initiatedOperationCount: 0 },
          },
        },
      },
      providers.map((provider) => ({
        ...provider,
        snapshot: { ...provider.snapshot!, accountAgeDays: 0, commitCount: 0 },
      })),
      now,
    );
    expect(result).toMatchObject({ status: 'available', score: 0, missingSources: [] });
  });
});
