import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { matchesOAuthStateCookie } from '../src/services/oauth/stateCookie.js';

describe('OAuth flow', () => {
  it('rejects a callback that is not bound to the initiating browser', async () => {
    const response = await request(app).get('/v1/oauth/github/callback?code=code&state=state');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      'http://localhost:5173/onboarding?provider=github&status=error',
    );
  });

  it('compares browser-bound OAuth state values', () => {
    expect(matchesOAuthStateCookie('matching-state', 'matching-state')).toBe(true);
    expect(matchesOAuthStateCookie('different-state', 'matching-state')).toBe(false);
    expect(matchesOAuthStateCookie(undefined, 'matching-state')).toBe(false);
  });
});
