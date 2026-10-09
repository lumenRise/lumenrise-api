import sharp from 'sharp';

const processAvatar = async (input: Buffer): Promise<Buffer | null> => {
  try {
    const image = sharp(input, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: 20_000_000,
    });
    const metadata = await image.metadata();

    if (
      !metadata.format ||
      !['jpeg', 'png', 'webp'].includes(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < 128 ||
      metadata.height < 128
    ) {
      return null;
    }

    return await image
      .rotate()
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return null;
  }
};

export default processAvatar;
