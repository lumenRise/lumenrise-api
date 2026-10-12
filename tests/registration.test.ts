import request from 'supertest';
import { Types } from 'mongoose';
import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import Identity from '../src/models/Identity';
import { withDatabaseTransaction } from '../src/db';
import StellarAccount from '../src/models/StellarAccount';
import uploadAvatar from '../src/services/avatar/uploadAvatar';
import processAvatar from '../src/services/avatar/processAvatar';
import deleteAvatarOrQueue from '../src/services/avatar/deleteAvatarOrQueue';
import { getVerifiedProviderAddresses } from '../src/services/auth/provider';
import isAvatarStorageConfigured from '../src/services/avatar/isAvatarStorageConfigured';

vi.mock('../src/env', async (original) => {
  const module = await original<{ default: Record<string, unknown> }>();
  return {
    default: {
      ...module.default,
      AUTH_PROVIDER_API_URL: 'https://identity.example/server',
      AUTH_PROVIDER_APP_ID: 'app-id',
      AUTH_PROVIDER_APP_SECRET: 'app-secret',
    },
  };
});
vi.mock('../src/services/auth/provider', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  getVerifiedProviderAddresses: vi.fn(),
}));
vi.mock('../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../src/services/avatar/uploadAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/processAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/deleteAvatarOrQueue', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/isAvatarStorageConfigured', () => ({ default: vi.fn() }));
const address = Keypair.random().publicKey();
const identityId = new Types.ObjectId();
const query = (value: unknown) => ({ session: vi.fn().mockResolvedValue(value) });

describe('Auth provider registration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(isAvatarStorageConfigured).mockReturnValue(true);
    vi.mocked(processAvatar).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(uploadAvatar).mockResolvedValue({
      objectKey: 'profiles/avatar.webp',
      publicUrl: 'https://images.example/avatar.webp',
    });
    vi.mocked(deleteAvatarOrQueue).mockResolvedValue(undefined);
    vi.mocked(getVerifiedProviderAddresses).mockReset().mockResolvedValue([address]);
    vi.mocked(withDatabaseTransaction).mockImplementation(async (operation) =>
      operation({} as never),
    );
    vi.spyOn(Identity, 'findOne').mockReturnValue(query(null) as never);
    vi.spyOn(StellarAccount, 'find').mockReturnValue(query([]) as never);
    vi.spyOn(StellarAccount, 'findOne').mockReturnValue(query(null) as never);
    vi.spyOn(Identity, 'create').mockResolvedValue([{ _id: identityId, name: 'Alice' }] as never);
    vi.spyOn(StellarAccount, 'create').mockResolvedValue([] as never);
  });

  it('stores a verified user and wallets without issuing credentials', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ userId: 42, name: 'Alice', address: 'untrusted' });
    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      userId: '42',
      identityId: identityId.toString(),
      name: 'Alice',
      avatarUrl: null,
      addresses: [address],
    });
    expect(Identity.create).toHaveBeenCalledWith(
      [expect.objectContaining({ externalUserId: '42', name: 'Alice' })],
      expect.anything(),
    );
    expect(StellarAccount.create).toHaveBeenCalledWith(
      [expect.objectContaining({ address, identity: identityId, isPrimary: true })],
      expect.anything(),
    );
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('does not write anything when verification fails', async () => {
    vi.mocked(getVerifiedProviderAddresses).mockResolvedValue(null);
    expect(
      (await request(app).post('/v1/auth/register').send({ userId: '42', name: 'Alice' })).status,
    ).toBe(401);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
    expect(Identity.create).not.toHaveBeenCalled();
  });

  it('requires a verified Stellar wallet', async () => {
    vi.mocked(getVerifiedProviderAddresses).mockResolvedValue([]);
    expect(
      (await request(app).post('/v1/auth/register').send({ userId: '42', name: 'Alice' })).status,
    ).toBe(422);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it('preserves a returning user identity and profile', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({
        _id: identityId,
        externalUserId: '42',
        status: 'active',
        name: 'Existing name',
      }) as never,
    );
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ userId: '42', name: 'Replacement' });
    expect(response.status).toBe(200);
    expect(response.body.result.name).toBe('Existing name');
    expect(Identity.create).not.toHaveBeenCalled();
  });

  it('does not reassign a wallet owned by another Auth provider identity', async () => {
    vi.mocked(StellarAccount.find).mockReturnValue(
      query([{ identity: identityId, address }]) as never,
    );
    vi.spyOn(Identity, 'findById').mockReturnValue(
      query({ _id: identityId, externalUserId: '43', status: 'active' }) as never,
    );
    expect(
      (await request(app).post('/v1/auth/register').send({ userId: '42', name: 'Alice' })).status,
    ).toBe(409);
    expect(Identity.create).not.toHaveBeenCalled();
    expect(StellarAccount.create).not.toHaveBeenCalled();
  });

  it('does not reactivate a suspended identity', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({ _id: identityId, externalUserId: '42', status: 'suspended' }) as never,
    );
    expect(
      (await request(app).post('/v1/auth/register').send({ userId: '42', name: 'Alice' })).status,
    ).toBe(409);
    expect(StellarAccount.create).not.toHaveBeenCalled();
  });

  it('reports upstream failure without writes', async () => {
    vi.mocked(getVerifiedProviderAddresses).mockRejectedValue(
      new Error('Auth provider unavailable'),
    );
    expect(
      (await request(app).post('/v1/auth/register').send({ userId: '42', name: 'Alice' })).status,
    ).toBe(503);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it('rejects malformed registration before calling Auth provider', async () => {
    expect((await request(app).post('/v1/auth/register').send({ userId: '../42' })).status).toBe(
      400,
    );
    expect(getVerifiedProviderAddresses).not.toHaveBeenCalled();
  });
  it.each([undefined, null, '', '   ', 'x'.repeat(81), 42])(
    'requires a valid name before verification: %s',
    async (name) => {
      expect(
        (await request(app).post('/v1/auth/register').send({ userId: '42', name })).status,
      ).toBe(400);
      expect(getVerifiedProviderAddresses).not.toHaveBeenCalled();
      expect(Identity.create).not.toHaveBeenCalled();
    },
  );

  it('registers without a photo even when storage is not configured', async () => {
    vi.mocked(isAvatarStorageConfigured).mockReturnValue(false);
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ userId: '42', name: ' Alice ' });
    expect(response.status).toBe(200);
    expect(response.body.result.avatarUrl).toBeNull();
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(Identity.create).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'Alice' })],
      expect.anything(),
    );
  });

  it('accepts form registration with an optional avatar', async () => {
    vi.mocked(Identity.create).mockResolvedValue([
      { _id: identityId, name: 'Alice', avatarUrl: 'https://images.example/avatar.webp' },
    ] as never);
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Alice')
      .attach('avatar', Buffer.from('photo'), { filename: 'avatar.png', contentType: 'image/png' });
    expect(response.status).toBe(200);
    expect(processAvatar).toHaveBeenCalledWith(Buffer.from('photo'));
    expect(uploadAvatar).toHaveBeenCalledTimes(1);
    expect(Identity.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'Alice',
          avatarObjectKey: 'profiles/avatar.webp',
          avatarUrl: 'https://images.example/avatar.webp',
        }),
      ],
      expect.anything(),
    );
    expect(response.body.result.avatarUrl).toBe('https://images.example/avatar.webp');
    expect(deleteAvatarOrQueue).not.toHaveBeenCalled();
  });

  it('accepts multipart registration without an avatar', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Alice');
    expect(response.status).toBe(200);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects invalid avatar bytes without registering', async () => {
    vi.mocked(processAvatar).mockResolvedValue(null);
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Alice')
      .attach('avatar', Buffer.from('invalid'), { filename: 'avatar.png' });
    expect(response.status).toBe(400);
    expect(Identity.create).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('cleans up an uploaded avatar if registration fails', async () => {
    vi.mocked(withDatabaseTransaction).mockRejectedValueOnce(new Error('Database unavailable'));
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Alice')
      .attach('avatar', Buffer.from('photo'), { filename: 'avatar.png' });
    expect(response.status).toBe(503);
    expect(deleteAvatarOrQueue).toHaveBeenCalledWith('profiles/avatar.webp');
  });

  it('preserves a registered profile when the registration is retried with another photo', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({
        _id: identityId,
        externalUserId: '42',
        status: 'active',
        name: 'Original',
        avatarUrl: 'https://images.example/original.webp',
      }) as never,
    );
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Replacement')
      .attach('avatar', Buffer.from('photo'), { filename: 'avatar.png' });
    expect(response.status).toBe(200);
    expect(response.body.result.name).toBe('Original');
    expect(response.body.result.avatarUrl).toBe('https://images.example/original.webp');
    expect(Identity.create).not.toHaveBeenCalled();
    expect(deleteAvatarOrQueue).toHaveBeenCalledWith('profiles/avatar.webp');
  });

  it('rejects extra avatar files before any registration writes', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .field('userId', '42')
      .field('name', 'Alice')
      .attach('avatar', Buffer.from('first'), { filename: 'first.png' })
      .attach('avatar', Buffer.from('second'), { filename: 'second.png' });
    expect(response.status).toBe(400);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });
  it('completes a previously verified identity with a missing name', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const identity = {
      _id: identityId,
      externalUserId: '42',
      status: 'active',
      name: null,
      avatarUrl: null,
      save,
    };
    vi.mocked(Identity.findOne).mockReturnValue(query(identity) as never);
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ userId: '42', name: 'Alice' });
    expect(response.status).toBe(200);
    expect(response.body.result.name).toBe('Alice');
    expect(save).toHaveBeenCalledTimes(1);
    expect(Identity.create).not.toHaveBeenCalled();
  });
});
