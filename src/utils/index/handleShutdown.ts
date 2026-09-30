import log from '../../logger';
import { shutdown } from './shutdown';

const handleShutdown = (signal: NodeJS.Signals): void => {
  void shutdown(signal).catch((error: unknown) => {
    log.error({ error }, 'Graceful shutdown failed');
    process.exitCode = 1;
  });
};

export { handleShutdown };
