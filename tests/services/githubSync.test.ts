import { describe, expect, it } from 'vitest';

import {
  getRetryAfterSeconds,
  needsCredentialRefresh,
} from '../../src/services/integration/githubSync.js';

describe('GitHub synchronization', () => {
  it('refreshes an access token before it expires', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');

    expect(needsCredentialRefresh(new Date('2026-09-22T12:04:59.000Z'), now)).toBe(true);
    expect(needsCredentialRefresh(new Date('2026-09-22T12:05:01.000Z'), now)).toBe(false);
  });

  it('keeps non-expiring access tokens', () => {
    expect(needsCredentialRefresh(null)).toBe(false);
  });

  it('returns a whole-second Retry-After value', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const availableAt = new Date('2026-09-22T12:00:01.001Z');

    expect(getRetryAfterSeconds(availableAt, now)).toBe(2);
  });
});
