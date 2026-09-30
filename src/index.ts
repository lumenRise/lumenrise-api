import app from './app';
import env from './env';
import log from './logger';
import { connectDatabase } from './db';
import serverState from './utils/index/state';
import { handleShutdown } from './utils/index/handleShutdown';
import runDatabaseMigrations from './migrations/runDatabaseMigrations';
import validateRuntimeConfiguration from './services/configuration/validateRuntimeConfiguration';

const bootstrap = async (): Promise<void> => {
  validateRuntimeConfiguration(env);

  await connectDatabase();
  await runDatabaseMigrations();

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
