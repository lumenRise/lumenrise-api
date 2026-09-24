import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGitLabAuthorization,
  getAuthenticatedGitLabUser,
  refreshGitLabAccessToken,
  revokeGitLabAccessToken,
} from '../../src/services/oauth/gitlab.js';

const mocks = vi.hoisted(() => ({ createOAuthState: vi.fn() }));

vi.mock('../../src/env.js', () => ({
  default: {
    GITLAB_BASE_URL: 'https://gitlab.example.com',
    GITLAB_CLIENT_ID: 'gitlab-client-id',
    GITLAB_CLIENT_SECRET: 'gitlab-client-secret',
    GITLAB_CALLBACK_URL: 'http://localhost:5000/v1/oauth/gitlab/callback',
  },
}));
vi.mock('../../src/models/OAuthState.js', () => ({
  default: { create: mocks.createOAuthState },
}));

describe('GitLab OAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.createOAuthState.mockReset();
  });

  it('creates a read-only authorization request with PKCE', async () => {
    const identityId = new Types.ObjectId();
    const flow = await createGitLabAuthorization('connect', identityId);
    const authorizationUrl = new URL(flow.authorizationUrl);
    const persistedState = mocks.createOAuthState.mock.calls[0]?.[0];

    expect(authorizationUrl.origin).toBe('https://gitlab.example.com');
    expect(authorizationUrl.pathname).toBe('/oauth/authorize');
    expect(authorizationUrl.searchParams.get('scope')).toBe('read_user read_api');
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('state')).toBe(flow.state);
    expect(persistedState.provider).toBe('gitlab');
    expect(persistedState.identity).toBe(identityId);
    expect(persistedState.codeVerifier).toHaveLength(43);
    expect(persistedState.codeChallenge).toHaveLength(43);
  });

  it('refreshes an access token through the configured GitLab instance', async () => {
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

    const token = await refreshGitLabAccessToken('old-refresh-token');
    const request = fetchMock.mock.calls[0];
    const body = request?.[1]?.body as URLSearchParams;

    expect(token.access_token).toBe('new-access-token');
    expect(request?.[0]).toBe('https://gitlab.example.com/oauth/token');
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh-token');
  });

  it('loads the authenticated GitLab profile with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 42,
          username: 'developer',
          name: 'Developer',
          web_url: 'https://gitlab.example.com/developer',
          avatar_url: null,
          created_at: '2020-01-01T00:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const user = await getAuthenticatedGitLabUser('access-token');
    const request = fetchMock.mock.calls[0];

    expect(user.username).toBe('developer');
    expect(request?.[0]).toBe('https://gitlab.example.com/api/v4/user');
    expect(request?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-token' });
  });

  it('revokes an access token through the configured GitLab instance', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await revokeGitLabAccessToken('access-token');

    const request = fetchMock.mock.calls[0];
    const body = request?.[1]?.body as URLSearchParams;

    expect(request?.[0]).toBe('https://gitlab.example.com/oauth/revoke');
    expect(body.get('token')).toBe('access-token');
  });
});
