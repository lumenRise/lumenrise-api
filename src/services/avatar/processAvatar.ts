import sharp from 'sharp';

import applicationRules from '../../constants/applicationRules';

const processAvatar = async (input: Buffer): Promise<Buffer | null> => {
  try {
    const image = sharp(input, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: applicationRules.images.maxInputPixels,
    });
    const metadata = await image.metadata();

    if (
      !metadata.format ||
      !applicationRules.images.formats.some((format) => format === metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < applicationRules.images.minWidth ||
      metadata.height < applicationRules.images.minHeight
    ) {
      return null;
    }

    return await image
      .rotate()
      .resize(applicationRules.images.outputWidth, applicationRules.images.outputHeight, {
        fit: applicationRules.images.avatar.fit,
        position: 'centre',
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return null;
  }
};

export default processAvatar;
