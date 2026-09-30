import log from '../../logger';
import { closeServer } from './closeServer';
import { disconnectDatabase } from '../../db';
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  log.info({ signal }, 'Shutdown started');

  try {
    await closeServer();
  } finally {
    await disconnectDatabase();
  }
};

export { shutdown };
