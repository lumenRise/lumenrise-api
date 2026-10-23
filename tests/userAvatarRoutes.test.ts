import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Identity from '../src/models/Identity';
import userRoutes from '../src/routes/user/index';
import removeAvatar from '../src/services/avatar/removeAvatar';
import replaceAvatar from '../src/services/avatar/replaceAvatar';
import updateProfileName from '../src/services/avatar/updateProfileName';
import isAvatarStorageConfigured from '../src/services/avatar/isAvatarStorageConfigured';

const identityId = new Types.ObjectId();

vi.mock('../src/env', () => ({
  default: { NODE_ENV: 'test', LOG_LEVEL: 'silent', R2_MAX_IMAGE_BYTES: 1024 },
}));
vi.mock('../src/middleware/requireSession', () => ({
  default: (req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = { identityId };
    next();
  },
}));
vi.mock('../src/services/avatar/isAvatarStorageConfigured', () => ({
  default: vi.fn().mockReturnValue(true),
}));
vi.mock('../src/services/avatar/replaceAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/updateProfileName', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/removeAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/models/Identity', () => ({ default: { findById: vi.fn() } }));

const app = express();
app.use('/v1/user', userRoutes);

describe('user avatar routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAvatarStorageConfigured).mockReturnValue(true);
  });

  it('reads the current profile from /v1/user', async () => {
    vi.mocked(Identity.findById).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: identityId,
        name: 'Alex',
        avatarUrl: null,
      }),
    } as never);

    const response = await request(app).get('/v1/user');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      identityId: identityId.toString(),
      name: 'Alex',
      avatarUrl: null,
    });
  });

  it('accepts exactly one avatar file on /v1/user/avatar', async () => {
    vi.mocked(replaceAvatar).mockResolvedValue({
      status: 'updated',
      result: {
        identityId: identityId.toString(),
        name: 'Alex',
        avatarUrl: 'https://images.lumenrise.app/new.webp',
      },
    });

    const response = await request(app)
      .put('/v1/user/avatar')
      .attach('avatar', Buffer.from('picture'), { filename: 'picture.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(replaceAvatar).toHaveBeenCalledWith(identityId, Buffer.from('picture'));
    expect(response.body.result.avatarUrl).toBe('https://images.lumenrise.app/new.webp');
  });

  it('rejects an oversized upload before storage', async () => {
    const response = await request(app)
      .put('/v1/user/avatar')
      .attach('avatar', Buffer.alloc(1025), { filename: 'large.png', contentType: 'image/png' });

    expect(response.status).toBe(413);
    expect(replaceAvatar).not.toHaveBeenCalled();
  });

  it('deletes the avatar under /v1/user/avatar', async () => {
    vi.mocked(removeAvatar).mockResolvedValue({
      status: 'updated',
      result: { identityId: identityId.toString(), name: 'Alex', avatarUrl: null },
    });

    const response = await request(app).delete('/v1/user/avatar');

    expect(response.status).toBe(200);
    expect(removeAvatar).toHaveBeenCalledWith(identityId);
  });

  it('updates only the name without requiring avatar storage', async (): Promise<void> => {
    vi.mocked(isAvatarStorageConfigured).mockReturnValue(false);

    vi.mocked(updateProfileName).mockResolvedValue({
      status: 'updated',
      result: { identityId: identityId.toString(), name: 'Alex Smith', avatarUrl: null },
    });

    const response = await request(app).put('/v1/user/avatar').field('name', '  Alex Smith  ');

    expect(response.status).toBe(200);
    expect(response.body.result.name).toBe('Alex Smith');
    expect(updateProfileName).toHaveBeenCalledWith(identityId, 'Alex Smith');
    expect(replaceAvatar).not.toHaveBeenCalled();
  });

  it('updates the name and avatar together in either multipart order', async (): Promise<void> => {
    vi.mocked(replaceAvatar).mockResolvedValue({
      status: 'updated',
      result: {
        identityId: identityId.toString(),
        name: 'Alex',
        avatarUrl: 'https://images.example/new.webp',
      },
    });

    for (const nameFirst of [true, false]) {
      const upload = request(app).put('/v1/user/avatar');

      if (nameFirst) {
        upload.field('name', 'Alex');
      }

      upload.attach('avatar', Buffer.from('picture'), 'picture.png');

      if (!nameFirst) {
        upload.field('name', 'Alex');
      }

      const response = await upload;

      expect(response.status).toBe(200);
      expect(replaceAvatar).toHaveBeenLastCalledWith(identityId, Buffer.from('picture'), 'Alex');
    }

    expect(updateProfileName).not.toHaveBeenCalled();
  });

  it('rejects invalid names before changing the avatar', async (): Promise<void> => {
    for (const name of ['', '   ', 'A'.repeat(81)]) {
      const response = await request(app)
        .put('/v1/user/avatar')
        .field('name', name)
        .attach('avatar', Buffer.from('picture'), 'picture.png');

      expect(response.status).toBe(400);
    }

    expect(replaceAvatar).not.toHaveBeenCalled();
    expect(updateProfileName).not.toHaveBeenCalled();
  });

  it('rejects empty requests, unknown fields, and duplicate names', async (): Promise<void> => {
    const empty = await request(app).put('/v1/user/avatar');

    expect(empty.status).toBe(400);

    const unknown = await request(app).put('/v1/user/avatar').field('nickname', 'Alex');

    expect(unknown.status).toBe(400);

    const duplicate = await request(app)
      .put('/v1/user/avatar')
      .field('name', 'Alex')
      .field('name', 'Sam');

    expect(duplicate.status).toBe(400);
    expect(replaceAvatar).not.toHaveBeenCalled();
    expect(updateProfileName).not.toHaveBeenCalled();
  });

  it('returns missing identities and database failures for name updates', async (): Promise<void> => {
    vi.mocked(updateProfileName).mockResolvedValue({ status: 'missing' });

    const missing = await request(app).put('/v1/user/avatar').field('name', 'Alex');

    expect(missing.status).toBe(404);

    vi.mocked(updateProfileName).mockRejectedValue(new Error('Database unavailable'));

    const unavailable = await request(app).put('/v1/user/avatar').field('name', 'Alex');

    expect(unavailable.status).toBe(503);
  });
});
