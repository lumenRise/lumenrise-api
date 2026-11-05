import type { Types } from 'mongoose';

import requestDomainRead from '../messaging/requestDomainRead';
import type { SybilEvidenceResult } from '../../types/sybil/evidence';
import type { StellarNetwork } from '../../types/network/configuration';

const getSybilEvidence = async (
  identityId: Types.ObjectId,
  network: StellarNetwork,
): Promise<SybilEvidenceResult | null> => {
  return requestDomainRead<SybilEvidenceResult | null>('reputation', 'sybil.evidence', {
    identity: identityId.toString(),
    network,
  });
};

export default getSybilEvidence;
