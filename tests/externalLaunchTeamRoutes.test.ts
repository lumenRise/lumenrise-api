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
import resolveNetwork from '../src/middleware/resolveNetwork';
import isR2Configured from '../src/storage/isR2Configured';
import ExternalAccount from '../src/models/ExternalAccount';
import LaunchTeamMember from '../src/models/LaunchTeamMember';
import processAvatar from '../src/services/avatar/processAvatar';
import uploadTeamImage from '../src/services/launch/uploadTeamImage';
import deleteAvatarOrQueue from '../src/services/avatar/deleteAvatarOrQueue';

vi.mock('../src/env', () => ({ default: { STELLAR_AUTH_NETWORK: 'testnet', R2_MAX_IMAGE_BYTES: 4096 } }));
vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/ExternalAccount', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/Identity', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn() } }));
vi.mock('../src/models/LaunchTeamMember', () => ({ default: {
  find: vi.fn(), create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn(),
} }));
vi.mock('../src/storage/isR2Configured', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/processAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/launch/uploadTeamImage', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/deleteAvatarOrQueue', () => ({ default: vi.fn() }));
vi.mock('../src/middleware/requireSession', () => {
  const requireSession: RequestHandler = (req, res, next) => {
    if (!req.get('x-user-id')) {
      res.status(401).json({ status: 'error', result: {} });

      return;
    }

    req.auth = { identityId: new Types.ObjectId('507f1f77bcf86cd799439011'), userId: 'owner' };

    next();
  };

  return { default: requireSession };
});

const app = express();

app.use(resolveNetwork);
const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));
const owner = Keypair.random().publicKey();
const memberId = new Types.ObjectId('507f1f77bcf86cd799439012');
const registeredId = new Types.ObjectId('507f1f77bcf86cd799439013');
const base = `/v1/launches/${contractId}/team`;
const external = {
  _id: memberId, network: 'testnet', contractId, kind: 'external', identity: null,
  name: 'Bob', role: 'Advisor', xAccount: 'https://x.com/bob',
  avatarUrl: 'https://images.example/bob.webp', avatarObjectKey: 'launch-teams/old.webp',
};

app.use(express.json());
app.use('/v1/launches', launchRoutes);

describe('external launch team members', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ExternalAccount.find).mockReturnValue({ select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }) } as never);
    vi.mocked(Launch.findOne).mockReturnValue({ select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ owner }),
    }) } as never);
    vi.mocked(StellarAccount.exists).mockResolvedValue({ _id: 'wallet' } as never);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(processAvatar).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(uploadTeamImage).mockResolvedValue({ objectKey: 'launch-teams/new.webp', publicUrl: 'https://images.example/new.webp' });
    vi.mocked(LaunchTeamMember.create).mockResolvedValue(external as never);
    vi.mocked(LaunchTeamMember.findOneAndUpdate).mockResolvedValue(external as never);
    vi.mocked(LaunchTeamMember.findOne).mockReturnValue({ select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(external),
    }) } as never);
    vi.mocked(LaunchTeamMember.findOneAndDelete).mockReturnValue({ select: vi.fn().mockResolvedValue(external) } as never);
  });

  it('creates an external member with a name, role, image and required X link without a user account', async () => {
    const result = await request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', ' Bob ').field('role', ' Advisor ').field('xAccount', ' https://x.com/bob ')
      .attach('image', Buffer.from('photo'), 'bob.png');

    expect(result.status).toBe(201);
    expect(Identity.find).not.toHaveBeenCalled();
    expect(LaunchTeamMember.create).toHaveBeenCalledWith(expect.objectContaining({
      network: 'testnet', contractId, kind: 'external', identity: null,
      name: 'Bob', role: 'Advisor', xAccount: 'https://x.com/bob',
      avatarUrl: 'https://images.example/new.webp', avatarObjectKey: 'launch-teams/new.webp',
    }));
    expect(result.body.result.member).toEqual({
      memberId: memberId.toString(), kind: 'external', identityId: null,
      name: 'Bob', role: 'Advisor', avatarUrl: external.avatarUrl, xAccount: external.xAccount,
    });
    expect(result.body.result.member.avatarObjectKey).toBeUndefined();
  });

  it('allows multiple external members without requiring registered identities', async () => {
    const actual = await vi.importActual('../src/models/LaunchTeamMember');
    const model = actual.default as typeof LaunchTeamMember;
    const index = model.schema.indexes().find(([, options]) => options.name === 'launch_team_member_unique');

    expect(index?.[1].partialFilterExpression).toEqual({ identity: { $type: 'objectId' } });
  });

  it.each([undefined, '', '   '])('requires a non-empty X link when adding an external member: %j', async (xAccount) => {
    let upload = request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor');

    if (xAccount !== undefined) {
      upload = upload.field('xAccount', xAccount);
    }

    const result = await upload.attach('image', Buffer.from('photo'), 'bob.png');

    expect(result.status).toBe(400);
    expect(LaunchTeamMember.create).not.toHaveBeenCalled();
    expect(uploadTeamImage).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])('cannot remove X when updating an external member: %j', async (xAccount) => {
    const result = await request(app).put(`${base}/external/${memberId}`)
      .set('x-user-id', 'owner').send({ name: 'Bob', role: 'Advisor', xAccount });

    expect(result.status).toBe(400);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each(['post', 'put', 'delete'] as const)('requires login for external %s', async (method) => {
    const url = method === 'post' ? `${base}/external` : `${base}/external/${memberId}`;
    const result = await request(app)[method](url).send({ name: 'Bob', role: 'Advisor', xAccount: 'https://x.com/bob' });

    expect(result.status).toBe(401);
    expect(processAvatar).not.toHaveBeenCalled();
    expect(LaunchTeamMember.create).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndDelete).not.toHaveBeenCalled();
  });

  it.each(['post', 'put', 'delete'] as const)('rejects non-owners for external %s', async (method) => {
    vi.mocked(StellarAccount.exists).mockResolvedValue(null);

    const url = method === 'post' ? `${base}/external` : `${base}/external/${memberId}`;
    const result = await request(app)[method](url).set('x-user-id', 'other').send({ name: 'Bob', role: 'Advisor', xAccount: 'https://x.com/bob' });

    expect(result.status).toBe(403);
    expect(processAvatar).not.toHaveBeenCalled();
    expect(LaunchTeamMember.create).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
    expect(LaunchTeamMember.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('requires an image when adding an external member', async () => {
    const result = await request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob');

    expect(result.status).toBe(400);
    expect(uploadTeamImage).not.toHaveBeenCalled();
  });

  it.each([
    { name: '', role: 'Advisor' },
    { name: 'Bob', role: '' },
    { name: 'a'.repeat(81), role: 'Advisor' },
    { name: 'Bob', role: 'a'.repeat(81) },
    { name: 'Bob', role: 'Advisor', xAccount: 'javascript:alert(1)' },
  ])('rejects invalid external member data: %j', async (input) => {
    const result = await request(app).put(`${base}/external/${memberId}`)
      .set('x-user-id', 'owner').send(input);

    expect(result.status).toBe(400);
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid images before uploading or saving', async () => {
    vi.mocked(processAvatar).mockResolvedValue(null);

    const result = await request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob')
      .attach('image', Buffer.from('invalid'), 'bob.png');

    expect(result.status).toBe(400);
    expect(uploadTeamImage).not.toHaveBeenCalled();
    expect(LaunchTeamMember.create).not.toHaveBeenCalled();
  });

  it('enforces the image upload size limit', async () => {
    const result = await request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob')
      .attach('image', Buffer.alloc(4097), 'bob.png');

    expect(result.status).toBe(413);
    expect(uploadTeamImage).not.toHaveBeenCalled();
  });

  it('cleans up an uploaded image when member creation fails', async () => {
    vi.mocked(LaunchTeamMember.create).mockRejectedValue(new Error('Database unavailable'));

    const result = await request(app).post(`${base}/external`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob')
      .attach('image', Buffer.from('photo'), 'bob.png');

    expect(result.status).toBe(503);
    expect(deleteAvatarOrQueue).toHaveBeenCalledWith('launch-teams/new.webp');
  });

  it('lists registered and external members together without exposing storage keys', async () => {
    vi.mocked(LaunchTeamMember.find).mockReturnValue({ sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([external, {
        _id: registeredId, kind: 'registered', identity: registeredId, role: 'Developer',
      }]),
    }) } as never);
    vi.mocked(Identity.find).mockReturnValue({ select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: registeredId, name: 'Alice', avatarUrl: null }]),
    }) } as never);

    const result = await request(app).get(base).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(result.body.result.members.map((member: { kind: string }) => member.kind)).toEqual(['external', 'registered']);
    expect(result.body.result.members[0].identityId).toBeNull();
    expect(result.body.result.members[1].name).toBe('Alice');
    expect(result.body.result.members[0].avatarObjectKey).toBeUndefined();
    expect(Identity.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: [registeredId] } }));
  });

  it('updates external details and X while preserving the existing image', async () => {
    const result = await request(app).put(`${base}/external/${memberId}`)
      .set('x-user-id', 'owner').send({ name: 'Robert', role: 'Designer', xAccount: 'https://x.com/robert' });

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      { network: 'testnet', contractId, _id: memberId.toString(), kind: 'external', avatarObjectKey: external.avatarObjectKey },
      { $set: { name: 'Robert', role: 'Designer', xAccount: 'https://x.com/robert' } },
      { runValidators: true, returnDocument: 'after' },
    );
    expect(uploadTeamImage).not.toHaveBeenCalled();
    expect(deleteAvatarOrQueue).not.toHaveBeenCalled();
  });

  it('replaces the external image and cleans up only the old image', async () => {
    const result = await request(app).put(`${base}/external/${memberId}`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob')
      .attach('image', Buffer.from('new photo'), 'bob.png');

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ avatarObjectKey: external.avatarObjectKey }),
      { $set: expect.objectContaining({ avatarUrl: 'https://images.example/new.webp', avatarObjectKey: 'launch-teams/new.webp' }) },
      expect.anything(),
    );
    expect(deleteAvatarOrQueue).toHaveBeenCalledExactlyOnceWith(external.avatarObjectKey);
  });

  it('cleans up a rejected replacement on a concurrent update', async () => {
    vi.mocked(LaunchTeamMember.findOneAndUpdate).mockResolvedValue(null);

    const result = await request(app).put(`${base}/external/${memberId}`).set('x-user-id', 'owner')
      .field('name', 'Bob').field('role', 'Advisor').field('xAccount', 'https://x.com/bob')
      .attach('image', Buffer.from('new photo'), 'bob.png');

    expect(result.status).toBe(409);
    expect(deleteAvatarOrQueue).toHaveBeenCalledExactlyOnceWith('launch-teams/new.webp');
  });

  it('cannot update another launch member or a registered member through the external route', async () => {
    vi.mocked(LaunchTeamMember.findOne).mockReturnValue({ select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }) } as never);

    const result = await request(app).put(`${base}/external/${memberId}`)
      .set('x-user-id', 'owner').send({ name: 'Bob', role: 'Advisor', xAccount: 'https://x.com/bob' });

    expect(result.status).toBe(404);
    expect(LaunchTeamMember.findOne).toHaveBeenCalledWith({ network: 'testnet', contractId, _id: memberId.toString(), kind: 'external' });
    expect(LaunchTeamMember.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('deletes only an external member in the selected launch and cleans up its image', async () => {
    const result = await request(app).delete(`${base}/external/${memberId}`).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(LaunchTeamMember.findOneAndDelete).toHaveBeenCalledWith({
      network: 'testnet', contractId, _id: memberId.toString(), kind: 'external',
    });
    expect(deleteAvatarOrQueue).toHaveBeenCalledExactlyOnceWith(external.avatarObjectKey);
  });

  it('does not clean up an unrelated image when deleting an absent member', async () => {
    vi.mocked(LaunchTeamMember.findOneAndDelete).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);

    const result = await request(app).delete(`${base}/external/${memberId}`).set('x-user-id', 'owner');

    expect(result.status).toBe(200);
    expect(deleteAvatarOrQueue).not.toHaveBeenCalled();
  });
});
