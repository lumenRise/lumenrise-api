import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Identity from '../src/models/Identity';
import userRoutes from '../src/routes/user/index';
import removeAvatar from '../src/services/avatar/removeAvatar';
import replaceAvatar from '../src/services/avatar/replaceAvatar';

const identityId = new Types.ObjectId();

vi.mock('../src/env', () => ({ default: { NODE_ENV: 'test', LOG_LEVEL: 'silent', R2_MAX_AVATAR_BYTES: 1024 } }));
vi.mock('../src/middleware/requireSession', () => ({ default: (req: { auth?: unknown }, _res: unknown, next: () => void) => {
  req.auth = { identityId };
  next();
} }));
vi.mock('../src/services/avatar/isAvatarStorageConfigured', () => ({ default: () => true }));
vi.mock('../src/services/avatar/replaceAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/removeAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/models/Identity', () => ({ default: { findById: vi.fn() } }));

const app = express();
app.use('/v1/user', userRoutes);

describe('user avatar routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the current profile from /v1/user', async () => {
    vi.mocked(Identity.findById).mockReturnValue({ select: vi.fn().mockResolvedValue({
      _id: identityId, name: 'Mahdi', avatarUrl: null,
    }) } as never);

    const response = await request(app).get('/v1/user');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ identityId: identityId.toString(), name: 'Mahdi', avatarUrl: null });
  });

  it('accepts exactly one avatar file on /v1/user/avatar', async () => {
    vi.mocked(replaceAvatar).mockResolvedValue({
      status: 'updated',
      result: { identityId: identityId.toString(), name: 'Mahdi', avatarUrl: 'https://images.lumenrise.app/new.webp' },
    });

    const response = await request(app).put('/v1/user/avatar')
      .attach('avatar', Buffer.from('picture'), { filename: 'picture.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(replaceAvatar).toHaveBeenCalledWith(identityId, Buffer.from('picture'));
    expect(response.body.result.avatarUrl).toBe('https://images.lumenrise.app/new.webp');
  });

  it('rejects an oversized upload before storage', async () => {
    const response = await request(app).put('/v1/user/avatar')
      .attach('avatar', Buffer.alloc(1025), { filename: 'large.png', contentType: 'image/png' });

    expect(response.status).toBe(413);
    expect(replaceAvatar).not.toHaveBeenCalled();
  });

  it('deletes the avatar under /v1/user/avatar', async () => {
    vi.mocked(removeAvatar).mockResolvedValue({
      status: 'updated', result: { identityId: identityId.toString(), name: 'Mahdi', avatarUrl: null },
    });

    const response = await request(app).delete('/v1/user/avatar');

    expect(response.status).toBe(200);
    expect(removeAvatar).toHaveBeenCalledWith(identityId);
  });
});
