import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import env from '../../env';
import getR2Client from '../../storage/getR2Client';
import type { TokenImageRecord } from '../../types/tokenImage';

const uploadTokenImage = async (network: TokenImageRecord['network'], body: Buffer) => {
  const objectKey = `tokens/${network}/${randomUUID()}.png`;
  const publicUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`;

  if (publicUrl.length > 256) {
    throw new Error('Public token image URL exceeds the current contract limit');
  }

  await getR2Client().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
    Body: body,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return { objectKey, publicUrl };
};

export default uploadTokenImage;
