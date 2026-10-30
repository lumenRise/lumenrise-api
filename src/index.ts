import app from './app';
import env from './env';
import log from './logger';
import { connectDatabase } from './db';
import serverState from './utils/index/state';
import { handleShutdown } from './utils/index/handleShutdown';
import getNetworkConfig from './services/network/getNetworkConfig';
import runDatabaseMigrations from './migrations/runDatabaseMigrations';
import refreshAvatarCleanup from './services/avatar/refreshAvatarCleanup';
import syncManagedStellarToml from './services/stellar/syncManagedStellarToml';
import verifyNetworkProviders from './services/network/verifyNetworkProviders';
import refreshManagedStellarToml from './services/stellar/refreshManagedStellarToml';
import refreshTokenImageCleanup from './services/tokenImage/refreshTokenImageCleanup';
import validateNetworkConfiguration from './services/network/validateNetworkConfiguration';
import validateRuntimeConfiguration from './services/configuration/validateRuntimeConfiguration';

const bootstrap = async (): Promise<void> => {
  validateRuntimeConfiguration(env);

  for (const network of ['testnet', 'public'] as const) {
    validateNetworkConfiguration(getNetworkConfig(network));
  }

  await Promise.all((['testnet', 'public'] as const).map(verifyNetworkProviders));

  await connectDatabase();
  await runDatabaseMigrations();
  await syncManagedStellarToml();

  serverState.server = app.listen(env.PORT, (): void => {
    log.info({ port: env.PORT }, 'Lumenrise API started');
  });

  void refreshAvatarCleanup();
  setInterval(() => void refreshAvatarCleanup(), 5 * 60_000).unref();

  void refreshTokenImageCleanup();
  setInterval(() => void refreshTokenImageCleanup(), 60 * 60_000).unref();

  setInterval(() => void refreshManagedStellarToml(), 5_000).unref();

  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
};

void bootstrap().catch((error: unknown) => {
  log.fatal({ err: error }, 'Lumenrise API failed to start');

  process.exitCode = 1;
});
