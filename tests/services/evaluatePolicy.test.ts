import { describe, expect, it } from 'vitest';

import type { PolicyDefinition } from '../../src/types/policy/model.js';
import evaluatePolicy from '../../src/services/policy/evaluatePolicy.js';
import type { ReputationProfileResult } from '../../src/types/reputation/profile.js';

const evaluatedAt = new Date('2026-09-24T12:00:00.000Z');
const profile: ReputationProfileResult = {
  identity: { id: '507f1f77bcf86cd799439011', name: 'Mahdi', primaryWalletAddress: null },
  developer: {
    category: 'developer',
    status: 'complete',
    algorithmVersion: 'developer-v1',
    score: 72,
    signals: [],
    sources: [
      {
        provider: 'github',
        snapshotId: '507f1f77bcf86cd799439012',
        dataVersion: 'v1',
        collectedAt: '2026-09-24T11:00:00.000Z',
      },
    ],
    calculatedAt: '2026-09-24T11:00:00.000Z',
  },
  social: {
    category: 'social',
    status: 'complete',
    algorithmVersion: 'social-v1',
    score: 45,
    signals: [],
    sources: [
      {
        provider: 'x',
        snapshotId: '507f1f77bcf86cd799439013',
        dataVersion: 'v1',
        collectedAt: '2026-09-24T11:30:00.000Z',
      },
    ],
    calculatedAt: '2026-09-24T11:30:00.000Z',
  },
  stellar: null,
};
const policy: PolicyDefinition = {
  key: 'public-builder',
  version: 2,
  match: 'all',
  rules: [
    { dimension: 'developer', minScore: 60, maxAgeSeconds: 7_200 },
    { dimension: 'social', minScore: 40, maxAgeSeconds: 7_200 },
  ],
};

describe('policy evaluation', () => {
  it('returns an explainable eligible result with a version and evidence expiry', () => {
    const result = evaluatePolicy(policy, profile, evaluatedAt);

    expect(result).toMatchObject({
      policyKey: 'public-builder',
      policyVersion: 2,
      decision: 'eligible',
      evaluatedAt: evaluatedAt.toISOString(),
      expiresAt: '2026-09-24T13:00:00.000Z',
      rules: [
        {
          dimension: 'developer',
          outcome: 'pass',
          reason: 'threshold_met',
          actualScore: 72,
          algorithmVersion: 'developer-v1',
          sourceIds: ['507f1f77bcf86cd799439012'],
        },
        {
          dimension: 'social',
          outcome: 'pass',
          reason: 'threshold_met',
          actualScore: 45,
          algorithmVersion: 'social-v1',
          sourceIds: ['507f1f77bcf86cd799439013'],
        },
      ],
    });
  });

  it('distinguishes a failed condition from missing evidence in an all policy', () => {
    const result = evaluatePolicy(
      {
        ...policy,
        rules: [
          { dimension: 'social', minScore: 60, maxAgeSeconds: 7_200 },
          { dimension: 'stellar', minScore: 20, maxAgeSeconds: 7_200 },
        ],
      },
      profile,
      evaluatedAt,
    );

    expect(result.decision).toBe('ineligible');
    expect(result.expiresAt).toBeNull();
    expect(result.rules.map((rule) => rule.reason)).toEqual([
      'below_threshold',
      'score_unavailable',
    ]);
  });

  it('returns insufficient data when no condition fails but one is unavailable', () => {
    const result = evaluatePolicy(
      {
        ...policy,
        rules: [policy.rules[0]!, { dimension: 'stellar', minScore: 20, maxAgeSeconds: 7_200 }],
      },
      profile,
      evaluatedAt,
    );

    expect(result.decision).toBe('insufficient_data');
  });

  it('allows an any policy when one fresh condition passes', () => {
    const result = evaluatePolicy(
      {
        ...policy,
        match: 'any',
        rules: [policy.rules[0]!, { dimension: 'stellar', minScore: 20, maxAgeSeconds: 7_200 }],
      },
      profile,
      evaluatedAt,
    );

    expect(result.decision).toBe('eligible');
    expect(result.expiresAt).toBe('2026-09-24T13:00:00.000Z');
  });

  it('rejects an any policy when every fresh condition fails', () => {
    const result = evaluatePolicy(
      {
        ...policy,
        match: 'any',
        rules: [
          { dimension: 'developer', minScore: 80, maxAgeSeconds: 7_200 },
          { dimension: 'social', minScore: 50, maxAgeSeconds: 7_200 },
        ],
      },
      profile,
      evaluatedAt,
    );

    expect(result.decision).toBe('ineligible');
    expect(result.rules.map((rule) => rule.reason)).toEqual(['below_threshold', 'below_threshold']);
  });

  it('evaluates only a verified and completed Stellar scan', () => {
    const stellarProfile: ReputationProfileResult = {
      ...profile,
      stellar: {
        address: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        ownershipVerified: true,
        scanStatus: 'completed',
        scan: null,
        score: {
          address: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
          ownershipVerified: true,
          eligibilityProof: false,
          source: 'horizon',
          scanId: '507f1f77bcf86cd799439014',
          algorithmVersion: 'stellar-activity-v1',
          availableHistoryScanned: true,
          pagesProcessed: 3,
          score: 65,
          signals: [],
          calculatedAt: '2026-09-24T11:00:00.000Z',
        },
      },
    };
    const stellarPolicy: PolicyDefinition = {
      key: 'stellar-participant',
      version: 1,
      match: 'all',
      rules: [{ dimension: 'stellar', minScore: 60, maxAgeSeconds: 7_200 }],
    };

    const result = evaluatePolicy(stellarPolicy, stellarProfile, evaluatedAt);

    expect(result.decision).toBe('eligible');
    expect(result.rules[0]).toMatchObject({
      actualScore: 65,
      algorithmVersion: 'stellar-activity-v1',
      sourceIds: ['507f1f77bcf86cd799439014'],
    });
    expect(
      evaluatePolicy(
        stellarPolicy,
        {
          ...stellarProfile,
          stellar: { ...stellarProfile.stellar!, scanStatus: 'running', score: null },
        },
        evaluatedAt,
      ).decision,
    ).toBe('insufficient_data');
  });

  it('does not use partial or expired scores as proof', () => {
    const partialProfile: ReputationProfileResult = {
      ...profile,
      developer: { ...profile.developer!, status: 'partial' },
    };
    const result = evaluatePolicy(policy, partialProfile, evaluatedAt);
    const stale = evaluatePolicy(policy, profile, new Date('2026-09-25T12:00:00.000Z'));

    expect(result.decision).toBe('insufficient_data');
    expect(result.rules[0]?.reason).toBe('score_incomplete');
    expect(stale.decision).toBe('insufficient_data');
    expect(stale.rules.map((rule) => rule.reason)).toEqual(['score_stale', 'score_stale']);
  });

  it('rejects malformed policies before evaluation', () => {
    expect(() => evaluatePolicy({ ...policy, rules: [] }, profile, evaluatedAt)).toThrow();
    expect(() => evaluatePolicy({ ...policy, version: 0 }, profile, evaluatedAt)).toThrow();
  });
});
