import { describe, expect, it } from 'vitest';

import buildSybilEvidence from '../../src/utils/sybil/buildSybilEvidence.js';
import type { ReputationProfileResult } from '../../src/types/reputation/profile.js';

const generatedAt = new Date('2026-09-25T12:00:00.000Z');
const profile: ReputationProfileResult = {
  identity: {
    id: '507f1f77bcf86cd799439011',
    name: null,
    primaryWalletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
  },
  developer: null,
  social: null,
  stellar: {
    address: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
    ownershipVerified: true,
    scanStatus: 'not_started',
    scan: null,
    score: null,
  },
};

describe('diagnostic Sybil evidence', () => {
  it('reports wallet control without declaring unique-person proof', () => {
    const result = buildSybilEvidence(profile, [], generatedAt);

    expect(result.algorithmVersion).toBe('sybil-evidence-v2');
    expect(result.generatedAt).toBe(generatedAt.toISOString());
    expect(result.assessment).toBe('not_assessed');
    expect(result.observations).toEqual([
      {
        source: 'stellar',
        ownership: 'wallet_registration',
        coverage: 'missing',
        sourceIds: [],
        observedAt: null,
        sourceVersion: null,
      },
    ]);
    expect(result.corroboration).toMatchObject({
      status: 'insufficient_data',
      score: null,
      missingSources: ['github', 'gitlab', 'stellar'],
    });
    expect(result.limitations).toContain(
      'Wallet proof establishes control at registration, not a unique person.',
    );
  });

  it('reports connected providers independently of missing snapshots', () => {
    const result = buildSybilEvidence(
      profile,
      [
        { provider: 'x', snapshot: null },
        { provider: 'github', snapshot: null },
      ],
      generatedAt,
    );

    expect(result.observations.map((observation) => observation.source)).toEqual([
      'stellar',
      'github',
      'x',
    ]);
    expect(result.observations.slice(1)).toEqual([
      {
        source: 'github',
        ownership: 'oauth_connection',
        coverage: 'missing',
        sourceIds: [],
        observedAt: null,
        sourceVersion: null,
      },
      {
        source: 'x',
        ownership: 'oauth_connection',
        coverage: 'missing',
        sourceIds: [],
        observedAt: null,
        sourceVersion: null,
      },
    ]);
  });

  it('does not count an unprocessed or failed scan as evidence coverage', () => {
    const result = buildSybilEvidence(
      {
        ...profile,
        stellar: {
          ...profile.stellar!,
          scanStatus: 'failed',
          scan: { pagesProcessed: 0 } as never,
        },
      },
      [],
      generatedAt,
    );

    expect(result.observations[0].coverage).toBe('missing');
  });

  it('uses source-specific provenance rather than a combined reputation score', () => {
    const result = buildSybilEvidence(
      {
        ...profile,
        stellar: {
          ...profile.stellar!,
          scanStatus: 'completed',
          score: {
            address: profile.identity.primaryWalletAddress!,
            ownershipVerified: true,
            eligibilityProof: false,
            source: 'horizon',
            scanId: '507f1f77bcf86cd799439013',
            algorithmVersion: 'stellar-v1',
            availableHistoryScanned: true,
            pagesProcessed: 1,
            score: 65,
            signals: [],
            calculatedAt: generatedAt.toISOString(),
          },
        },
      },
      [
        {
          provider: 'github',
          snapshot: {
            id: '507f1f77bcf86cd799439012',
            status: 'partial',
            dataVersion: 'github-v1',
            collectedAt: generatedAt.toISOString(),
          },
        },
      ],
      generatedAt,
    );

    expect(result.observations[0]).toMatchObject({
      coverage: 'complete',
      sourceIds: ['507f1f77bcf86cd799439013'],
      sourceVersion: 'stellar-v1',
    });
    expect(result.observations[1]).toMatchObject({
      coverage: 'partial',
      sourceIds: ['507f1f77bcf86cd799439012'],
      sourceVersion: 'github-v1',
    });
    expect(result.limitations).toContain('Horizon may not retain complete historical activity.');
  });
});
