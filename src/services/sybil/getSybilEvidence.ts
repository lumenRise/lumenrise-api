import type { Types } from 'mongoose';

import getReputationProfile from '../reputation/profile.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { SybilEvidenceResult } from '../../types/sybil/evidence.js';
import buildSybilEvidence from '../../utils/sybil/buildSybilEvidence.js';
import getProviderEvidence from '../../utils/sybil/getProviderEvidence.js';

const getSybilEvidence = async (
  identityId: Types.ObjectId,
): Promise<SybilEvidenceResult | null> => {
  const [profile, accounts] = await Promise.all([
    getReputationProfile(identityId),
    ExternalAccount.find({ identity: identityId, status: 'connected' }),
  ]);

  if (!profile) {
    return null;
  }

  const providers = await Promise.all(accounts.map(getProviderEvidence));

  return buildSybilEvidence(profile, providers);
};

export default getSybilEvidence;
