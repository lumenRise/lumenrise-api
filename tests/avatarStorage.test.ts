import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import getR2Client from '../src/storage/getR2Client';
import uploadAvatar from '../src/services/avatar/uploadAvatar';

const send = vi.fn().mockResolvedValue({});

vi.mock('../src/env', () => ({ default: {
  R2_BUCKET_NAME: 'lumenrise-profiles',
  R2_PUBLIC_BASE_URL: 'https://images.lumenrise.app/',
} }));
vi.mock('../src/storage/getR2Client', () => ({ default: vi.fn(() => ({ send })) }));

describe('R2 avatar storage', () => {
  it('writes an immutable WebP under a random identity-scoped key', async () => {
    const identityId = new Types.ObjectId();
    const body = Buffer.from('processed-webp');

    const stored = await uploadAvatar(identityId, body);

    expect(getR2Client).toHaveBeenCalledOnce();
    expect(stored.objectKey).toMatch(new RegExp(`^profiles/${identityId.toString()}/[0-9a-f-]{36}\\.webp$`));
    expect(stored.publicUrl).toBe(`https://images.lumenrise.app/${stored.objectKey}`);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'lumenrise-profiles', Key: stored.objectKey, Body: body,
      ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
    });
  });
});
