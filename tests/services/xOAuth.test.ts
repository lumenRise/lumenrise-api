import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createXAuthorization,
  getAuthenticatedXUser,
  refreshXAccessToken,
  revokeXAccessToken,
} from '../../src/services/oauth/x.js';

const mocks = vi.hoisted(() => ({ createOAuthState: vi.fn() }));

vi.mock('../../src/env.js', () => ({
  default: {
    X_CLIENT_ID: 'x-client-id',
    X_CLIENT_SECRET: 'x-client-secret',
    X_CALLBACK_URL: 'http://localhost:5000/v1/oauth/x/callback',
  },
}));
vi.mock('../../src/models/OAuthState.js', () => ({
  default: { create: mocks.createOAuthState },
}));

describe('X OAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.createOAuthState.mockReset();
  });

  it('creates a read-only authorization request with PKCE and offline access', async () => {
    const identityId = new Types.ObjectId();
    const flow = await createXAuthorization('connect', identityId);
    const authorizationUrl = new URL(flow.authorizationUrl);
    const persistedState = mocks.createOAuthState.mock.calls[0]?.[0];

    expect(authorizationUrl.origin).toBe('https://x.com');
    expect(authorizationUrl.pathname).toBe('/i/oauth2/authorize');
    expect(authorizationUrl.searchParams.get('scope')).toBe(
      'users.read tweet.read offline.access',
    );
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('state')).toBe(flow.state);
    expect(persistedState.provider).toBe('x');
    expect(persistedState.identity).toBe(identityId);
    expect(persistedState.codeVerifier).toHaveLength(43);
    expect(persistedState.codeChallenge).toHaveLength(43);
  });

  it('refreshes a token as a confidential X client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 7_200,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const token = await refreshXAccessToken('old-refresh-token');
    const request = fetchMock.mock.calls[0];
    const body = request?.[1]?.body as URLSearchParams;

    expect(token.access_token).toBe('new-access-token');
    expect(request?.[0]).toBe('https://api.x.com/2/oauth2/token');
    expect(request?.[1]?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('x-client-id:x-client-secret').toString('base64')}`,
    });
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh-token');
    expect(body.has('client_id')).toBe(false);
  });

  it('loads the authenticated X profile with public metrics', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: '42',
            username: 'developer',
            name: 'Developer',
            public_metrics: {
              followers_count: 5,
              following_count: 3,
              tweet_count: 20,
              listed_count: 1,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const user = await getAuthenticatedXUser('access-token');
    const request = fetchMock.mock.calls[0];

    expect(user.username).toBe('developer');
    expect(user.public_metrics?.followers_count).toBe(5);
    expect(request?.[0]).toContain('https://api.x.com/2/users/me?user.fields=');
    expect(request?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-token' });
  });

  it('revokes an X token as a confidential client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await revokeXAccessToken('access-token');

    const request = fetchMock.mock.calls[0];
    const body = request?.[1]?.body as URLSearchParams;

    expect(request?.[0]).toBe('https://api.x.com/2/oauth2/revoke');
    expect(body.get('token')).toBe('access-token');
  });
});
