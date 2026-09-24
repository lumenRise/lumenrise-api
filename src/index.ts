import app from './app.js';
import env from './env.js';
import log from './logger.js';
import { connectDatabase } from './db.js';
import serverState from './utils/index/state.js';
import { handleShutdown } from './utils/index/handleShutdown.js';
import { startXScheduler } from './services/integration/xScheduler.js';
import runDatabaseMigrations from './migrations/runDatabaseMigrations.js';
import { startIntegrationSyncWorker } from './services/integration/syncWorker.js';
import { startStellarActivityScanWorker } from './services/stellar/activityScanWorker.js';
import validateRuntimeConfiguration from './services/configuration/validateRuntimeConfiguration.js';

const bootstrap = async (): Promise<void> => {
  validateRuntimeConfiguration(env);

  await connectDatabase();
  await runDatabaseMigrations();

  startIntegrationSyncWorker();
  startStellarActivityScanWorker();
  startXScheduler();

  serverState.server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, 'Lumenrise API started');
  });

  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
};

void bootstrap().catch((error: unknown) => {
  log.fatal({ error }, 'Lumenrise API failed to start');
  process.exitCode = 1;
});
