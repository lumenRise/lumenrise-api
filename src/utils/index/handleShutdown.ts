import log from '../../logger.js';
import { shutdown } from './shutdown.js';

const handleShutdown = (signal: NodeJS.Signals): void => {
  void shutdown(signal).catch((error: unknown) => {
    log.error({ error }, 'Graceful shutdown failed');
    process.exitCode = 1;
  });
};

export { handleShutdown };
