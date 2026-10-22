import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import type { RequestHandler } from 'express';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import Identity from '../src/models/Identity';
import launchRoutes from '../src/routes/launches';
import StellarAccount from '../src/models/StellarAccount';
import ExternalAccount from '../src/models/ExternalAccount';
import resolveNetwork from '../src/middleware/resolveNetwork';
import LaunchTeamMember from '../src/models/LaunchTeamMember';

vi.mock('../src/env', () => ({ default: { STELLAR_AUTH_NETWORK: 'testnet' } }));
vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn(), find: vi.fn() } }));
vi.mock('../src/models/ExternalAccount', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/Identity', () => ({ default: { find: vi.fn(), findOne: vi.fn() } }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn(), findOne: vi.fn() } }));
vi.mock('../src/models/LaunchTeamMember', () => ({
  default: { find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), deleteOne: vi.fn() },
}));
vi.mock('../src/middleware/requireSession', () => {
  const requireSession: RequestHandler = (req, res, next) => {
    if (!req.get('x-user-id')) {
      res.status(401).json({ status: 'error', result: {} });

      return;
    }

    req.auth = {
      identityId: new Types.ObjectId(
        req.get('x-user-id') === 'member' ? '507f1f77bcf86cd799439012' : '507f1f77bcf86cd799439011',
      ),
      userId: req.get('x-user-id')!,
    };

    next();
  };

  return { default: requireSession };
});

const app = express();

app.use(resolveNetwork);
const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));
const owner = Keypair.random().publicKey();
const memberId = new Types.ObjectId('507f1f77bcf86cd799439012');
const profile = { _id: memberId, name: 'Alice', avatarUrl: 'https://images.example/alice.png' };
const base = '/v1/launches/blue-man/team';

app.use(express.json());
app.use('/v1/launches', launchRoutes);

describe('owner-managed launch teams', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ExternalAccount.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as never);
    vi.mocked(Launch.find).mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) } as never);
    vi.mocked(Launch.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ owner, contractId }),
      }),
    } as never);
    vi.mocked(StellarAccount.exists).mockResolvedValue({ _id: 'wallet' } as never);
    vi.mocked(Identity.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(profile),
      }),
    } as never);
    vi.mocked(Identity.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([profile]),
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([profile]) }),
        }),
      }),
    } as never);
    vi.mocked(LaunchTeamMember.findOneAndUpdate).mockResolvedValue({
      _id: memberId,
      kind: 'registered',
      identity: memberId,
      role: 'Developer',
      status: 'pending',
      slot: 1,
    } as never);
    vi.mocked(LaunchTeamMember.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    vi.mocked(LaunchTeamMember.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ slot: 1 }]),
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: memberId,
            kind: 'registered',
            identity: memberId,
            role: 'Developer',
            status: 'pending',
            slot: 1,
          },
        ]),
      }),
    } as never);
  });

  it.each(['get', 'put', 'delete'] as const)('requires login for %s', async (method) => {
    const url = method === 'get' ? base : `${base}/${memberId}`;
    const result = await request(app)[method](url).send({ role: 'Developer' });

    expect(result.status).toBe(401);
    expect(Launch.findOne).not.toHaveBeenCalled();
  });

  it.each(['get', 'put', 'delete'] as const)('rejects non-owners for %s', async (method) => {
    vi.mocked(StellarAccount.exists).mockResolvedValue(null);

    const url = method === 'get' ? base : `${base}/${memberId}`;
    const pendingRequest = request(app)[method](url);
    const result = await pendingRequest.set('x-user-id', 'owner').send({ role: 'Developer' });

    expect(result.status).toBe(403);
    expect(LaunchTeamMember.find).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    expect(LaunchTeamMember.deleteOne).not.toHaveBeenCalled();
    expect(StellarAccount.exists).toHaveBeenCalledWith({
      identity: new Types.ObjectId('507f1f77bcf86cd799439011'),
      address: owner,
      disconnectedAt: null,
    });
  });

  it('validates the launch identity before querying the database', async () => {
    const result = await request(app).get('/v1/launches/INVALID/team').set('x-user-id', 'owner');

    expect(result.status).toBe(400);
    expect(Launch.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 for an unindexed launch', async () => {
    vi.mocked(Launch.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as never);

    const result = await request(app).get(base).set('x-user-id', 'owner');

    expect(result.status).toBe(404);
    expect(StellarAccount.exists).not.toHaveBeenCalled();
  });

  it('adds or updates a registered member with a descriptive role, scoped to its launch and network', async () => {
    const result = await request(app)
      .put(`${base}/${memberId}?network=public`)
      .set('x-user-id', 'owner')
      .send({ role: ' Developer ' });

    expect(result.status).toBe(200);
    expect(Identity.findOne).toHaveBeenCalledWith({
      _id: memberId.toString(),
      status: 'active',
      deletedAt: null,
      externalUserId: { $type: 'string', $ne: '' },
    });
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      { network: 'public', contractId, kind: 'registered', identity: memberId, status: 'pending' },
      { $set: { role: 'Developer', slot: 2, status: 'pending' } },
      { upsert: true, runValidators: true, returnDocument: 'after' },
    );
    expect(result.body.result.member).toEqual({
      memberId: memberId.toString(),
      kind: 'registered',
      identityId: memberId.toString(),
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      role: 'Developer',
      xAccount: null,
      status: 'pending',
    });
  });

  it('rejects unregistered, deleted or suspended targets', async () => {
    vi.mocked(Identity.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as never);

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer' });

    expect(result.status).toBe(404);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   ', 42, 'a'.repeat(81)])('rejects invalid roles: %j', async (role) => {
    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role });

    expect(result.status).toBe(400);
    expect(Identity.findOne).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each(['get', 'put'] as const)(
    'reads a registered member X link from the connected profile for %s',
    async (method) => {
      vi.mocked(ExternalAccount.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              identity: memberId,
              profileUrl: 'https://x.com/alice',
              username: 'alice',
            },
          ]),
        }),
      } as never);

      const url = method === 'get' ? base : `${base}/${memberId}`;
      const pendingRequest = request(app)[method](url);
      const result = await pendingRequest
        .set('x-user-id', 'owner')
        .send({ role: 'Developer', xAccount: 'https://x.com/forged' });
      const member = method === 'get' ? result.body.result.members[0] : result.body.result.member;

      expect(result.status).toBe(200);
      expect(member.xAccount).toBe('https://x.com/alice');
      expect(ExternalAccount.find).toHaveBeenCalledWith({
        identity: { $in: [memberId] },
        provider: 'x',
        status: 'connected',
        disconnectedAt: null,
      });
    },
  );

  it('allows a registered member without a connected X account and ignores client-supplied X', async () => {
    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer', xAccount: 'https://x.com/forged' });

    expect(result.status).toBe(200);
    expect(result.body.result.member.xAccount).toBeNull();
  });

  it('builds the X profile link from the connected username when profileUrl is absent', async () => {
    vi.mocked(ExternalAccount.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue([{ identity: memberId, profileUrl: null, username: 'alice' }]),
      }),
    } as never);

    const result = await request(app).get(base).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(result.body.result.members[0].xAccount).toBe('https://x.com/alice');
  });

  it('returns roles and public user profiles without auth identifiers', async () => {
    const result = await request(app).get(base).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(result.body.result.members).toEqual([
      {
        memberId: memberId.toString(),
        kind: 'registered',
        identityId: memberId.toString(),
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        role: 'Developer',
        xAccount: null,
        status: 'pending',
      },
    ]);
  });

  it('does not expose inactive or deleted profiles in the team list', async () => {
    vi.mocked(Identity.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    const result = await request(app).get(base).set('x-user-id', 'owner');

    expect(result.body.result.members).toEqual([]);
    expect(Identity.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        deletedAt: null,
        externalUserId: { $type: 'string', $ne: '' },
      }),
    );
  });

  it('searches registered candidates using a literal partial name', async () => {
    const result = await request(app)
      .get(`${base}/candidates`)
      .query({ search: ' A.* ' })
      .set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(Identity.find).toHaveBeenCalledWith({
      name: { $regex: 'A\\.\\*', $options: 'i' },
      status: 'active',
      deletedAt: null,
      externalUserId: { $type: 'string', $ne: '' },
    });
    expect(result.body.result.users).toEqual([
      {
        identityId: memberId.toString(),
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    ]);
  });

  it('can select candidates by their exact connected wallet', async () => {
    vi.mocked(StellarAccount.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ identity: memberId }),
      }),
    } as never);

    const result = await request(app)
      .get(`${base}/candidates`)
      .query({ search: owner })
      .set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(StellarAccount.findOne).toHaveBeenCalledWith({ address: owner, disconnectedAt: null });
    expect(Identity.find).toHaveBeenCalledWith(expect.objectContaining({ _id: memberId }));
  });

  it('rejects candidate search by a non-owner', async () => {
    vi.mocked(StellarAccount.exists).mockResolvedValue(null);

    const result = await request(app)
      .get(`${base}/candidates`)
      .query({ search: 'Alice' })
      .set('x-user-id', 'other');

    expect(result.status).toBe(403);
    expect(Identity.find).not.toHaveBeenCalled();
  });

  it.each(['', 'a', 'a'.repeat(81)])('rejects invalid candidate searches: %j', async (search) => {
    const result = await request(app)
      .get(`${base}/candidates`)
      .query({ search })
      .set('x-user-id', 'owner');

    expect(result.status).toBe(400);
    expect(Identity.find).not.toHaveBeenCalled();
  });

  it('removes membership only from the selected launch', async () => {
    const result = await request(app).delete(`${base}/${memberId}`).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.deleteOne).toHaveBeenCalledWith({
      network: 'testnet',
      contractId,
      kind: 'registered',
      identity: memberId.toString(),
    });
  });

  it.each(['put', 'delete'] as const)('rejects malformed member IDs for %s', async (method) => {
    const pendingRequest = request(app)[method](`${base}/invalid`);
    const result = await pendingRequest.set('x-user-id', 'owner').send({ role: 'Developer' });

    expect(result.status).toBe(400);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    expect(LaunchTeamMember.deleteOne).not.toHaveBeenCalled();
  });

  it('reports database failure without allowing the mutation', async () => {
    vi.mocked(StellarAccount.exists).mockRejectedValue(new Error('Database unavailable'));

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer' });

    expect(result.status).toBe(503);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it.each(['507f1f77bcf86cd799439011', '507F1F77BCF86CD799439011'])(
    'rejects inviting the owner: %s',
    async (identityId) => {
      const result = await request(app)
        .put(`${base}/${identityId}`)
        .set('x-user-id', 'owner')
        .send({ role: 'Developer' });

      expect(result.status).toBe(400);
      expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('reserves all five additional slots for active members and pending invitations', async () => {
    vi.mocked(LaunchTeamMember.find).mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          { slot: 1, status: 'pending' },
          { slot: 2, status: 'active' },
          { slot: 3 },
          { slot: 4 },
          { slot: 5 },
        ]),
    } as never);

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer' });

    expect(result.status).toBe(409);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('preserves accepted status on owner role edits even when the team is full', async () => {
    vi.mocked(LaunchTeamMember.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'active', slot: 3 }),
    } as never);

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Designer', status: 'pending' });

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      { $set: { role: 'Designer', slot: 3, status: 'active' } },
      expect.anything(),
    );
  });

  it('requires new consent when reinviting a canceled member and ignores owner-supplied status', async () => {
    vi.mocked(LaunchTeamMember.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'canceled' }),
    } as never);

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer', status: 'active' });

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' }),
      { $set: { role: 'Developer', slot: 2, status: 'pending' } },
      expect.anything(),
    );
  });

  it.each(['active', 'canceled'])(
    'lets only the invited identity respond with %s',
    async (status) => {
      vi.mocked(LaunchTeamMember.findOneAndUpdate).mockResolvedValue({ status } as never);
      vi.mocked(StellarAccount.exists).mockResolvedValue(null);

      const result = await request(app)
        .patch(`${base}/invitation?network=public`)
        .set('x-user-id', 'member')
        .send({ status, identityId: 'forged' });

      expect(result.status).toBe(200);
      expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
        {
          network: 'public',
          contractId,
          kind: 'registered',
          identity: memberId,
          status: 'pending',
          slot: { $gte: 1, $lte: 5 },
        },
        { $set: { status }, ...(status === 'canceled' ? { $unset: { slot: 1 } } : {}) },
        { runValidators: true, returnDocument: 'after' },
      );
      expect(StellarAccount.exists).not.toHaveBeenCalled();
    },
  );

  it('rejects a response without a pending invitation belonging to the caller', async () => {
    vi.mocked(LaunchTeamMember.findOneAndUpdate).mockResolvedValue(null);

    const result = await request(app)
      .patch(`${base}/invitation`)
      .set('x-user-id', 'owner')
      .send({ status: 'active' });

    expect(result.status).toBe(404);
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: new Types.ObjectId('507f1f77bcf86cd799439011'),
        status: 'pending',
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it.each(['pending', 'invalid', null])(
    'rejects an invalid invitation response: %j',
    async (status) => {
      const result = await request(app)
        .patch(`${base}/invitation`)
        .set('x-user-id', 'member')
        .send({ status });

      expect(result.status).toBe(400);
      expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('lists pending invitations scoped to the caller and network', async () => {
    const result = await request(app)
      .get('/v1/launches/team/invitations?network=public')
      .set('x-user-id', 'member');

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.find).toHaveBeenCalledWith({
      network: 'public',
      identity: memberId,
      kind: 'registered',
      status: 'pending',
    });
    expect(Launch.findOne).not.toHaveBeenCalled();
  });

  it('reports a concurrent slot conflict as a retryable response', async () => {
    vi.mocked(LaunchTeamMember.findOneAndUpdate).mockRejectedValue({ code: 11000 });

    const result = await request(app)
      .put(`${base}/${memberId}`)
      .set('x-user-id', 'owner')
      .send({ role: 'Developer' });

    expect(result.status).toBe(409);
  });
});
