import type { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import env from '../../env';
import getR2Client from '../../storage/getR2Client';
import type { StoredAvatar } from '../../types/avatar';

const uploadAvatar = async (identityId: Types.ObjectId, body: Buffer): Promise<StoredAvatar> => {
  const objectKey = `profiles/${identityId.toString()}/${randomUUID()}.webp`;

  await getR2Client().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
    Body: body,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    objectKey,
    publicUrl: `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`,
  };
};

export default uploadAvatar;
