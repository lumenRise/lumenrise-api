import sharp from 'sharp';

import applicationRules from '../../constants/applicationRules';

const processTokenImage = async (input: Buffer): Promise<Buffer | null> => {
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
      metadata.height < applicationRules.images.minHeight ||
      (metadata.pages ?? 1) !== 1
    ) {
      return null;
    }

    return await image
      .rotate()
      .resize(applicationRules.images.outputWidth, applicationRules.images.outputHeight, {
        fit: applicationRules.images.token.fit,
        background: '#00000000',
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
};

export default processTokenImage;
