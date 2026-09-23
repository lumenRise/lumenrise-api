import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import ReputationSnapshot from '../../src/models/ReputationSnapshot.js';

describe('ReputationSnapshot model', () => {
  it('stores an explainable and versioned developer score', async () => {
    const calculatedAt = new Date('2026-09-22T12:00:00.000Z');
    const snapshot = new ReputationSnapshot({
      identity: new Types.ObjectId(),
      category: 'developer',
      status: 'complete',
      algorithmVersion: 'developer-v1',
      score: 72,
      calculatedAt,
      signals: [
        {
          provider: 'github',
          key: 'public_repository_count',
          rawValue: 24,
          normalizedScore: 80,
          weight: 0.25,
          contribution: 20,
          observedAt: calculatedAt,
        },
      ],
      sources: [
        {
          provider: 'github',
          snapshot: new Types.ObjectId(),
          dataVersion: 'github-data-v1',
          collectedAt: calculatedAt,
        },
      ],
    });

    await snapshot.validate();

    expect(snapshot.score).toBe(72);
    expect(snapshot.signals).toHaveLength(1);
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.signals[0]?.contribution).toBe(20);
  });

  it('rejects a complete snapshot without a score', async () => {
    const snapshot = new ReputationSnapshot({
      identity: new Types.ObjectId(),
      category: 'social',
      status: 'complete',
      algorithmVersion: 'social-v1',
      score: null,
      calculatedAt: new Date(),
    });

    await expect(snapshot.validate()).rejects.toMatchObject({
      errors: {
        score: expect.anything(),
      },
    });
  });

  it('rejects signal scores outside the normalized range', async () => {
    const snapshot = new ReputationSnapshot({
      identity: new Types.ObjectId(),
      category: 'social',
      status: 'partial',
      algorithmVersion: 'social-v1',
      score: 50,
      calculatedAt: new Date(),
      signals: [
        {
          provider: 'x',
          key: 'follower_count',
          rawValue: 1_000,
          normalizedScore: 101,
          weight: 0.5,
          contribution: 50,
          observedAt: new Date(),
        },
      ],
    });

    await expect(snapshot.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'signals.0.normalizedScore': expect.anything(),
      }),
    });
  });
});
