import log from '../../../../logger';
import { publishReputationJob } from '../../../../services/integration/publishReputationJob';
const STELLAR_SCAN_QUEUE = 'lumenrise.reputation.stellar-scan.v1';

const wakeStellarScan = async (scanId: string): Promise<void> => {
  try {
    await publishReputationJob(STELLAR_SCAN_QUEUE, scanId);
  } catch (error) {
    log.warn({ error, scanId }, 'Stellar scan wakeup failed; MongoDB job remains queued');
  }
};

export { wakeStellarScan };
