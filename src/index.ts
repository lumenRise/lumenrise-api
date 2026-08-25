import type { Server } from 'node:http';

import app from './app';
import env from './env';
import log from './logger';

let server: Server | undefined;

const shutdown = (signal: NodeJS.Signals): void => {
  log.info({ signal }, 'Shutdown started');

  if (!server) {
    process.exit(0);
  }

  server.close((error) => {
    if (error) {
      log.error({ error }, 'Graceful shutdown failed');
      process.exit(1);
    }

    process.exit(0);
  });
};
const bootstrap = (): void => {
  server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, 'Lumenrise API started');
  });

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

bootstrap();
