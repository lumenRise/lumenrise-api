import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncXAccount } from '../../src/services/integration/xSync.js';
import type { ExternalAccountDocument } from '../../src/types/integration/model.js';

const mocks = vi.hoisted(() => ({
  collectXData: vi.fn(),
  deleteSnapshot: vi.fn(),
  getCredential: vi.fn(),
  getUser: vi.fn(),
  leaseAccount: vi.fn(),
  updateAccount: vi.fn(),
  storeSocialScore: vi.fn(),
}));

vi.mock('../../src/models/ExternalAccount.js', () => ({
  default: {
    findOneAndUpdate: mocks.leaseAccount,
    updateOne: mocks.updateAccount,
  },
}));
vi.mock('../../src/models/XDataSnapshot.js', () => ({
  default: { deleteOne: mocks.deleteSnapshot },
}));
vi.mock('../../src/services/integration/providerCredential.js', () => ({
  getProviderCredential: mocks.getCredential,
}));
vi.mock('../../src/services/oauth/x.js', () => ({
  getAuthenticatedXUser: mocks.getUser,
}));
vi.mock('../../src/services/reputation/xData.js', () => ({
  collectXData: mocks.collectXData,
}));
vi.mock('../../src/services/reputation/socialScore.js', () => ({
  calculateAndStoreSocialReputation: mocks.storeSocialScore,
}));

const accountId = new Types.ObjectId();
const identityId = new Types.ObjectId();
const snapshotId = new Types.ObjectId();
const account = {
  _id: accountId,
  identity: identityId,
  provider: 'x',
  providerAccountId: '42',
  lastSyncedAt: null,
} as ExternalAccountDocument;

describe('X account synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.leaseAccount.mockResolvedValue(account);
    mocks.getCredential.mockResolvedValue({
      provider: 'x',
      accessToken: 'access-token',
      refreshToken: null,
      accessTokenExpiresAt: null,
    });
    mocks.getUser.mockResolvedValue({ id: '42', username: 'developer', name: 'Developer' });
    mocks.collectXData.mockResolvedValue({
      _id: snapshotId,
      collectedAt: new Date('2026-09-23T12:00:00.000Z'),
    });
    mocks.deleteSnapshot.mockResolvedValue({ deletedCount: 1 });
    mocks.storeSocialScore.mockResolvedValue(undefined);
  });

  it('removes a collected snapshot if the connection was cut during synchronization', async () => {
    mocks.updateAccount.mockResolvedValueOnce({ matchedCount: 0 });

    const outcome = await syncXAccount(account, new Date('2026-09-23T12:00:00.000Z'));
    const updateFilter = mocks.updateAccount.mock.calls[0]?.[0];

    expect(outcome).toEqual({ state: 'disconnected' });
    expect(updateFilter).toMatchObject({ status: 'connected' });
    expect(updateFilter.syncLeaseUntil).toBeInstanceOf(Date);
    expect(mocks.deleteSnapshot).toHaveBeenCalledWith({ _id: snapshotId });
    expect(mocks.storeSocialScore).not.toHaveBeenCalled();
  });

  it('stores a score after a successful account update', async () => {
    mocks.updateAccount.mockResolvedValueOnce({ matchedCount: 1 });

    const outcome = await syncXAccount(account, new Date('2026-09-23T12:00:00.000Z'));

    expect(outcome.state).toBe('synchronized');
    expect(mocks.storeSocialScore).toHaveBeenCalledWith(identityId);
    expect(mocks.deleteSnapshot).not.toHaveBeenCalled();
  });
});
