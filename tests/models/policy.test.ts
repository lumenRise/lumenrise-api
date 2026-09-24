import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import Policy from '../../src/models/Policy.js';

describe('Policy model', () => {
  it('accepts a versioned combination of score rules', async () => {
    const policy = new Policy({
      ownerIdentity: new Types.ObjectId(),
      key: 'public-builder',
      version: 1,
      match: 'all',
      rules: [
        { dimension: 'developer', minScore: 60, maxAgeSeconds: 86_400 },
        { dimension: 'social', minScore: 50, maxAgeSeconds: 86_400 },
      ],
    });

    await expect(policy.validate()).resolves.toBeUndefined();
    expect(policy.rules).toHaveLength(2);
    expect(Policy.schema.indexes()).toContainEqual([
      { ownerIdentity: 1, key: 1, version: 1 },
      { unique: true, name: 'policies_owner_key_version_unique' },
    ]);
  });

  it('rejects repeated dimensions and empty rule groups', async () => {
    const repeated = new Policy({
      ownerIdentity: new Types.ObjectId(),
      key: 'public-builder',
      version: 1,
      match: 'all',
      rules: [
        { dimension: 'developer', minScore: 60, maxAgeSeconds: 86_400 },
        { dimension: 'developer', minScore: 70, maxAgeSeconds: 86_400 },
      ],
    });
    const empty = new Policy({
      ownerIdentity: new Types.ObjectId(),
      key: 'public-builder',
      version: 1,
      match: 'all',
      rules: [],
    });

    await expect(repeated.validate()).rejects.toMatchObject({
      errors: { rules: expect.anything() },
    });
    await expect(empty.validate()).rejects.toMatchObject({ errors: { rules: expect.anything() } });
  });

  it('rejects invalid thresholds, freshness windows and versions', async () => {
    const policy = new Policy({
      ownerIdentity: new Types.ObjectId(),
      key: 'public-builder',
      version: 1.5,
      match: 'all',
      rules: [{ dimension: 'social', minScore: 101, maxAgeSeconds: 59 }],
    });

    await expect(policy.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        version: expect.anything(),
        'rules.0.minScore': expect.anything(),
        'rules.0.maxAgeSeconds': expect.anything(),
      }),
    });
  });
});
