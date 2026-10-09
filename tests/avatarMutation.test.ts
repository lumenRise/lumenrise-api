import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Identity from '../src/models/Identity';
import uploadAvatar from '../src/services/avatar/uploadAvatar';
import replaceAvatar from '../src/services/avatar/replaceAvatar';
import deleteAvatarOrQueue from '../src/services/avatar/deleteAvatarOrQueue';

vi.mock('../src/models/Identity', () => ({ default: { findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock('../src/services/avatar/processAvatar', () => ({ default: vi.fn().mockResolvedValue(Buffer.from('webp')) }));
vi.mock('../src/services/avatar/uploadAvatar', () => ({ default: vi.fn() }));
vi.mock('../src/services/avatar/deleteAvatarOrQueue', () => ({ default: vi.fn() }));

const identityId = new Types.ObjectId();

describe('avatar replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Identity.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: identityId, name: 'Mahdi', avatarObjectKey: 'profiles/old.webp' }),
    } as never);
    vi.mocked(uploadAvatar).mockResolvedValue({
      objectKey: 'profiles/new.webp', publicUrl: 'https://images.lumenrise.app/profiles/new.webp',
    });
  });

  it('replaces the old image after an atomic DB update', async () => {
    vi.mocked(Identity.findOneAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: identityId, name: 'Mahdi', avatarUrl: 'https://images.lumenrise.app/profiles/new.webp',
      }),
    } as never);

    const result = await replaceAvatar(identityId, Buffer.from('image'));

    expect(result.status).toBe('updated');
    expect(Identity.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: identityId, status: 'active', avatarObjectKey: 'profiles/old.webp' },
      expect.anything(), { new: true },
    );
    expect(deleteAvatarOrQueue).toHaveBeenCalledWith('profiles/old.webp');
  });

  it('cleans up a losing upload without deleting the winner', async () => {
    vi.mocked(Identity.findOneAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    const result = await replaceAvatar(identityId, Buffer.from('image'));

    expect(result.status).toBe('conflict');
    expect(deleteAvatarOrQueue).toHaveBeenCalledExactlyOnceWith('profiles/new.webp');
  });
});
