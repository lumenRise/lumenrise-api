import request from 'supertest';
import { Types } from 'mongoose';
import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import Identity from '../src/models/Identity';
import { withDatabaseTransaction } from '../src/db';
import StellarAccount from '../src/models/StellarAccount';
import verifyProviderAddress from '../src/services/auth/verifyProviderAddress';

vi.mock('../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../src/services/auth/verifyProviderAddress', () => ({ default: vi.fn() }));

const identityId = new Types.ObjectId();
const otherId = new Types.ObjectId();
const address = Keypair.random().publicKey();
const query = (value: unknown): { session: ReturnType<typeof vi.fn> } => ({
  session: vi.fn().mockResolvedValue(value),
});

// The same verified wallet must retain its identity across alternate Blux user IDs.
describe('identity resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(verifyProviderAddress).mockResolvedValue(true);
    vi.mocked(withDatabaseTransaction).mockImplementation(async (operation) =>
      operation({} as never),
    );
    vi.spyOn(Identity, 'findOne').mockReturnValue(query(null) as never);
    vi.spyOn(Identity, 'findById').mockReturnValue(query(null) as never);
    vi.spyOn(StellarAccount, 'findOne').mockReturnValue(query(null) as never);
    vi.spyOn(Identity, 'updateOne').mockResolvedValue({} as never);
  });

  it('links an alternate ID and preserves the existing profile', async () => {
    vi.mocked(StellarAccount.findOne).mockReturnValue(query({ identity: identityId }) as never);
    vi.mocked(Identity.findById).mockReturnValue(
      query({
        _id: identityId,
        status: 'active',
        name: 'Alice',
        avatarUrl: 'https://images.example/avatar.webp',
      }) as never,
    );

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      registered: true,
      userId: '87',
      identityId: identityId.toString(),
      name: 'Alice',
      avatarUrl: 'https://images.example/avatar.webp',
    });
    expect(verifyProviderAddress).toHaveBeenCalledWith('87', address);
    expect(Identity.updateOne).toHaveBeenCalledWith(
      { _id: identityId },
      { $addToSet: { externalUserIds: '87' } },
      { session: {} },
    );
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('resolves a known alias to the same identity on repeated login', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({ _id: identityId, status: 'active', name: 'Alice' }) as never,
    );
    vi.mocked(StellarAccount.findOne).mockReturnValue(query({ identity: identityId }) as never);

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '42', address });

    expect(response.status).toBe(200);
    expect(response.body.result.identityId).toBe(identityId.toString());
    expect(Identity.findOne).toHaveBeenCalledWith({ externalUserIds: '42' });
    expect(Identity.findById).not.toHaveBeenCalled();
  });

  it('requests profile details for a new wallet without creating an identity', async () => {
    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ registered: false, userId: '87' });
    expect(Identity.updateOne).not.toHaveBeenCalled();
  });

  it('links an existing incomplete identity but still requests profile details', async () => {
    vi.mocked(StellarAccount.findOne).mockReturnValue(query({ identity: identityId }) as never);
    vi.mocked(Identity.findById).mockReturnValue(
      query({ _id: identityId, status: 'active', name: ' ' }) as never,
    );

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.body.result).toEqual({ registered: false, userId: '87' });
    expect(Identity.updateOne).toHaveBeenCalledTimes(1);
  });

  it('never merges two existing identities', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({ _id: identityId, status: 'active', name: 'Alice' }) as never,
    );
    vi.mocked(StellarAccount.findOne).mockReturnValue(query({ identity: otherId }) as never);

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '42', address });

    expect(response.status).toBe(409);
    expect(Identity.updateOne).not.toHaveBeenCalled();
  });

  it.each(['suspended', 'deleted'])(
    'does not bypass a %s identity with a new ID',
    async (status: string) => {
      vi.mocked(StellarAccount.findOne).mockReturnValue(query({ identity: identityId }) as never);
      vi.mocked(Identity.findById).mockReturnValue(query({ _id: identityId, status }) as never);

      const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

      expect(response.status).toBe(403);
      expect(Identity.updateOne).not.toHaveBeenCalled();
    },
  );

  it('rejects an unverified pair before database access', async () => {
    vi.mocked(verifyProviderAddress).mockResolvedValue(false);

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(401);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it('does not treat a provider outage as a new user', async () => {
    vi.mocked(verifyProviderAddress).mockRejectedValue(new Error('Unavailable'));

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(503);
    expect(response.body.result).not.toHaveProperty('registered');
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it('returns a conflict when another identity claims the alias concurrently', async () => {
    vi.mocked(Identity.findOne).mockReturnValue(
      query({ _id: identityId, status: 'active', name: 'Alice' }) as never,
    );
    vi.mocked(Identity.updateOne).mockRejectedValue({ code: 11000 });

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(409);
  });

  it.each([{ userId: '87' }, { userId: 'invalid', address }, { userId: '87', address: 'invalid' }])(
    'rejects invalid input before verification',
    async (body: object) => {
      const response = await request(app).post('/v1/auth/resolve').send(body);

      expect(response.status).toBe(400);
      expect(verifyProviderAddress).not.toHaveBeenCalled();
    },
  );
});
