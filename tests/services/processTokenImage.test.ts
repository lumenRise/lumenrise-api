import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import processTokenImage from '../../src/services/tokenImage/processTokenImage';

describe('token image processing', () => {
  it('converts a valid image into a transparent 512px PNG', async () => {
    const input = await sharp({ create: { width: 256, height: 128, channels: 3, background: '#ff0000' } }).jpeg().toBuffer();
    const result = await processTokenImage(input);

    expect(result).not.toBeNull();
    const metadata = await sharp(result!).metadata();
    expect(metadata).toMatchObject({ format: 'png', width: 512, height: 512, hasAlpha: true });
  });

  it('rejects malformed images and images smaller than 128px', async () => {
    const small = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#ff0000' } }).png().toBuffer();

    expect(await processTokenImage(Buffer.from('not an image'))).toBeNull();
    expect(await processTokenImage(small)).toBeNull();
  });
});
