import type { Types } from 'mongoose';

import env from '../../env';
import Identity from '../../models/Identity';
import StellarAccount from '../../models/StellarAccount';
import getCurrentReputationSnapshot from './currentSnapshot';
import StellarActivityScan from '../../models/StellarActivityScan';
import type { ReputationProfileResult } from '../../types/reputation/profile';
import toStellarReputationResult from '../../utils/reputation/toStellarReputationResult';
import toReputationSnapshotResult from '../../utils/reputation/toReputationSnapshotResult';
const getReputationProfile = async (
  identityId: Types.ObjectId,
): Promise<ReputationProfileResult | null> => {
  const [identity, wallet, developerSnapshot, socialSnapshot] = await Promise.all([
    Identity.findById(identityId),
    StellarAccount.findOne({ identity: identityId, isPrimary: true, disconnectedAt: null }),
    getCurrentReputationSnapshot(identityId, 'developer'),
    getCurrentReputationSnapshot(identityId, 'social'),
  ]);

  if (!identity) {
    return null;
  }

  const scan = wallet
    ? await StellarActivityScan.findOne({
        identity: identityId,
        address: wallet.address,
        sourceUrl: env.STELLAR_HORIZON_URL,
      }).sort({ createdAt: -1 })
    : null;

  return {
    identity: {
      id: identity._id.toString(),
      name: identity.name,
      primaryWalletAddress: wallet?.address ?? null,
    },
    developer: developerSnapshot ? toReputationSnapshotResult(developerSnapshot) : null,
    social: socialSnapshot ? toReputationSnapshotResult(socialSnapshot) : null,
    stellar: wallet ? toStellarReputationResult(wallet.address, scan) : null,
  };
};

export default getReputationProfile;
