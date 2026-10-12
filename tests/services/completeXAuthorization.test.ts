import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { completeXAuthorization } from '../../src/services/oauth/x';
import { createClientRedirect } from '../../src/utils/routes/oauth/x/callback/createClientRedirect';

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  exchange: vi.fn(),
  profile: vi.fn(),
  connect: vi.fn(),
  store: vi.fn(),
  enqueue: vi.fn(),
}));
vi.mock('../../src/models/OAuthState', () => ({ default: { findOneAndUpdate: mocks.consume } }));
vi.mock('../../src/utils/services/oauth/x/assertXConfiguration', () => ({
  assertXConfiguration: vi.fn(),
}));
vi.mock('../../src/utils/services/oauth/x/exchangeXCode', () => ({
  exchangeXCode: mocks.exchange,
}));
vi.mock('../../src/utils/services/oauth/x/getAuthenticatedXUser', () => ({
  getAuthenticatedXUser: mocks.profile,
}));
vi.mock('../../src/utils/services/oauth/x/connectXAccount', () => ({
  connectXAccount: mocks.connect,
}));
vi.mock('../../src/services/integration/providerCredential', () => ({
  storeProviderCredential: mocks.store,
}));
vi.mock('../../src/services/integration/syncQueue', () => ({ enqueueXSync: mocks.enqueue }));

describe('manual X calculation after OAuth connection', () => {
  it('connects and stores credentials without creating a synchronization job', async () => {
    const identityId = new Types.ObjectId();
    const externalAccountId = new Types.ObjectId();
    mocks.consume.mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue({ purpose: 'connect', identity: identityId, codeVerifier: 'verifier' }),
    });
    mocks.exchange.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_in: 7200,
    });
    mocks.profile.mockResolvedValue({ id: '42', username: 'developer' });
    mocks.connect.mockResolvedValue({ identityId, externalAccount: { _id: externalAccountId } });
    const result = await completeXAuthorization('code', 'state');
    expect(result.connection).toEqual({ identityId: identityId.toString(), username: 'developer' });
    expect(mocks.store).toHaveBeenCalledWith(
      externalAccountId,
      'x',
      expect.objectContaining({ accessToken: 'token' }),
    );
    expect(mocks.enqueue).not.toHaveBeenCalled();
    const redirect = new URL(createClientRedirect('success', result.connection.username));
    expect(redirect.searchParams.get('username')).toBe('developer');
    expect(redirect.searchParams.has('syncJobId')).toBe(false);
  });
});
