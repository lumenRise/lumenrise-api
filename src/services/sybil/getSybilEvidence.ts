import type { Types } from 'mongoose';

import getReputationProfile from '../reputation/profile';
import ExternalAccount from '../../models/ExternalAccount';
import type { SybilEvidenceResult } from '../../types/sybil/evidence';
import buildSybilEvidence from '../../utils/sybil/buildSybilEvidence';
import getProviderEvidence from '../../utils/sybil/getProviderEvidence';

const getSybilEvidence = async (
  identityId: Types.ObjectId,
): Promise<SybilEvidenceResult | null> => {
  const [profile, accounts] = await Promise.all([
    getReputationProfile(identityId),
    ExternalAccount.find({ identity: identityId, status: 'connected', provider: { $in: ['github', 'x'] } }),
  ]);

  if (!profile) {
    return null;
  }

  const providers = await Promise.all(accounts.map(getProviderEvidence));

  return buildSybilEvidence(profile, providers);
};

export default getSybilEvidence;
