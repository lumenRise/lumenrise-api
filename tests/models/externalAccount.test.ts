import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import ExternalAccount from '../../src/models/ExternalAccount.js';

describe('ExternalAccount model', () => {
  it('stores a provider identity without OAuth credentials', async () => {
    const connectedAt = new Date('2026-09-22T12:00:00.000Z');
    const account = new ExternalAccount({
      identity: new Types.ObjectId(),
      provider: 'github',
      providerAccountId: '12345',
      username: 'lumenrise-user',
      connectedAt,
    });

    await account.validate();

    expect(account.status).toBe('connected');
    expect(account.lastSyncedAt).toBeNull();
    expect(account.disconnectedAt).toBeNull();
    expect(account.toObject()).not.toHaveProperty('accessToken');
    expect(account.toObject()).not.toHaveProperty('refreshToken');
  });

  it('requires a disconnection timestamp for disconnected accounts', async () => {
    const account = new ExternalAccount({
      identity: new Types.ObjectId(),
      provider: 'x',
      providerAccountId: '67890',
      username: 'lumenrise_x',
      status: 'disconnected',
      connectedAt: new Date(),
    });

    await expect(account.validate()).rejects.toMatchObject({
      errors: {
        disconnectedAt: expect.anything(),
      },
    });
  });

  it('declares provider ownership and active connection indexes', () => {
    expect(ExternalAccount.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { provider: 1, providerAccountId: 1 },
          expect.objectContaining({
            unique: true,
            name: 'external_accounts_provider_account_unique',
          }),
        ],
        [
          { identity: 1, provider: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { status: 'connected' },
            name: 'external_accounts_one_connected_provider_per_identity',
          }),
        ],
      ]),
    );
  });
});
