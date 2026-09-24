import { describe, expect, it } from 'vitest';

import parsePolicyDefinition from '../../src/utils/policy/parsePolicyDefinition.js';

describe('policy request parsing', () => {
  it('accepts a valid versioned policy and strips untrusted extra fields', () => {
    expect(
      parsePolicyDefinition({
        key: 'stellar-active',
        version: 1,
        match: 'all',
        rules: [{ dimension: 'stellar', minScore: 50, maxAgeSeconds: 86_400, ignored: true }],
        ownerIdentity: 'another-user',
      }),
    ).toEqual({
      key: 'stellar-active',
      version: 1,
      match: 'all',
      rules: [{ dimension: 'stellar', minScore: 50, maxAgeSeconds: 86_400 }],
    });
  });

  it('rejects malformed and repeated rules', () => {
    expect(parsePolicyDefinition(null)).toBeNull();
    expect(parsePolicyDefinition({ key: 'test', version: 1, match: 'all' })).toBeNull();
    expect(
      parsePolicyDefinition({
        key: 'stellar-active',
        version: 1,
        match: 'all',
        rules: [
          { dimension: 'stellar', minScore: 50, maxAgeSeconds: 86_400 },
          { dimension: 'stellar', minScore: 60, maxAgeSeconds: 86_400 },
        ],
      }),
    ).toBeNull();
  });
});
