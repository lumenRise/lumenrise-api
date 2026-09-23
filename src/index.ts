import type { Server } from 'node:http';

import app from './app.js';
import env from './env.js';
import log from './logger.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import runDatabaseMigrations from './migrations/runDatabaseMigrations.js';
import { startXScheduler, stopXScheduler } from './services/integration/xScheduler.js';
import validateRuntimeConfiguration from './services/configuration/validateRuntimeConfiguration.js';
import {
  startIntegrationSyncWorker,
  stopIntegrationSyncWorker,
} from './services/integration/syncWorker.js';

let server: Server | undefined;

const closeServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  log.info({ signal }, 'Shutdown started');

  try {
    await closeServer();
    await stopXScheduler();
    await stopIntegrationSyncWorker();
  } finally {
    await disconnectDatabase();
  }
};
const handleShutdown = (signal: NodeJS.Signals): void => {
  void shutdown(signal).catch((error: unknown) => {
    log.error({ error }, 'Graceful shutdown failed');
    process.exitCode = 1;
  });
};
const bootstrap = async (): Promise<void> => {
  validateRuntimeConfiguration(env);

  await connectDatabase();
  await runDatabaseMigrations();
  startIntegrationSyncWorker();
  startXScheduler();

  server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, 'Lumenrise API started');
  });

  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
};

void bootstrap().catch((error: unknown) => {
  log.fatal({ error }, 'Lumenrise API failed to start');
  process.exitCode = 1;
});
