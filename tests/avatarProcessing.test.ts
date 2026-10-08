import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import processAvatar from '../src/services/avatar/processAvatar';

describe('avatar image processing', () => {
  it('normalizes a valid PNG to a 512px WebP without metadata', async () => {
    const input = await sharp({ create: {
      width: 300, height: 200, channels: 4, background: '#ff0000',
    } }).png().withMetadata({ orientation: 1 }).toBuffer();

    const result = await processAvatar(input);

    expect(result).not.toBeNull();
    const metadata = await sharp(result!).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(metadata.exif).toBeUndefined();
  });

  it('rejects corrupt and undersized input', async () => {
    expect(await processAvatar(Buffer.from('not an image'))).toBeNull();
    const small = await sharp({ create: {
      width: 50, height: 50, channels: 3, background: '#000000',
    } }).jpeg().toBuffer();
    expect(await processAvatar(small)).toBeNull();
  });
});
