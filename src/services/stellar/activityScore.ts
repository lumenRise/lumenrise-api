import requestDomainRead from '../messaging/requestDomainRead';
import type { StellarActivityScanDocument } from '../../types/stellar/scan';
import type { StellarActivityScoreResult } from '../../types/stellar/score';

const calculateStellarActivityScore = async (
  scan: StellarActivityScanDocument,
): Promise<StellarActivityScoreResult> => {
  return requestDomainRead<StellarActivityScoreResult>('reputation', 'stellar.score', {
    scanId: scan._id.toString(),
    identity: scan.identity.toString(),
    network: scan.network,
  });
};

export { calculateStellarActivityScore };
