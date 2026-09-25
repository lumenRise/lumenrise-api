import log from '../../logger.js';
import { closeServer } from './closeServer.js';
import { disconnectDatabase } from '../../db.js';
import { stopXScheduler } from '../../services/integration/xScheduler.js';
import { stopIntegrationSyncWorker } from '../../services/integration/syncWorker.js';
import { stopSorobanEvidenceWorker } from '../../services/stellar/sorobanEvidenceWorker.js';
import { stopStellarActivityScanWorker } from '../../services/stellar/activityScanWorker.js';

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  log.info({ signal }, 'Shutdown started');

  try {
    await closeServer();
    await stopXScheduler();
    await stopIntegrationSyncWorker();
    await stopStellarActivityScanWorker();
    await stopSorobanEvidenceWorker();
  } finally {
    await disconnectDatabase();
  }
};

export { shutdown };
