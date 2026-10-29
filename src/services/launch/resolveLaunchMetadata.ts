import TokenImage from '../../models/TokenImage';
import type { LaunchRecord } from '../../types/launch/model';

const resolveLaunchMetadata = async (launch: LaunchRecord): Promise<LaunchRecord['metadata']> => {
  const image = await TokenImage.findOne({
    chain: 'stellar' as const,
    network: launch.network,
    publicUrl: launch.metadata.logo,
    ownerAddress: launch.owner,
    status: { $ne: 'expired' },
  }).lean();

  return {
    ...launch.metadata,
    description: image?.description ?? '',
    ...(image?.website ? { website: image.website } : {}),
    ...(image?.xAccount ? { xAccount: image.xAccount } : {}),
  };
};

export default resolveLaunchMetadata;
