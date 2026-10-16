import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import env from '../../env';
import getR2Client from '../../storage/getR2Client';
import type { StoredAvatar } from '../../types/avatar';
import type { MarketIdentity } from '../../types/launch/market';

const uploadTeamImage = async (
  launch: MarketIdentity,
  memberId: string,
  body: Buffer,
): Promise<StoredAvatar> => {
  const objectKey = `launch-teams/${launch.network}/${launch.contractId}/${memberId}/${randomUUID()}.webp`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return {
    objectKey,
    publicUrl: `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`,
  };
};

export default uploadTeamImage;
