import type { Types } from 'mongoose';

import env from '../../env.js';
import Identity from '../../models/Identity.js';
import StellarAccount from '../../models/StellarAccount.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';
import toStellarReputationResult from '../../utils/reputation/toStellarReputationResult.js';
import toReputationSnapshotResult from '../../utils/reputation/toReputationSnapshotResult.js';

const getReputationProfile = async (
  identityId: Types.ObjectId,
): Promise<ReputationProfileResult | null> => {
  const [identity, wallet, accounts, developerSnapshot, socialSnapshot] = await Promise.all([
    Identity.findById(identityId),
    StellarAccount.findOne({ identity: identityId, isPrimary: true, disconnectedAt: null }),
    ExternalAccount.find({ identity: identityId, status: 'connected' }),
    ReputationSnapshot.findOne({ identity: identityId, category: 'developer' }).sort({
      calculatedAt: -1,
    }),
    ReputationSnapshot.findOne({ identity: identityId, category: 'social' }).sort({
      calculatedAt: -1,
    }),
  ]);

  if (!identity) {
    return null;
  }

  const connectedProviders = new Set(accounts.map((account) => account.provider));

  const hasDeveloperConnection =
    connectedProviders.has('github') || connectedProviders.has('gitlab');
  const developerCurrent =
    hasDeveloperConnection &&
    developerSnapshot?.sources.every((source) => connectedProviders.has(source.provider));

  const socialCurrent =
    connectedProviders.has('x') &&
    socialSnapshot?.sources.every((source) => connectedProviders.has(source.provider));

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
    developer:
      developerSnapshot && developerCurrent ? toReputationSnapshotResult(developerSnapshot) : null,
    social: socialSnapshot && socialCurrent ? toReputationSnapshotResult(socialSnapshot) : null,
    stellar: wallet ? toStellarReputationResult(wallet.address, scan) : null,
  };
};

export default getReputationProfile;
