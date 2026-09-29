import log from '../../logger.js';
import { closeServer } from './closeServer.js';
import { disconnectDatabase } from '../../db.js';

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  log.info({ signal }, 'Shutdown started');

  try {
    await closeServer();
  } finally {
    await disconnectDatabase();
  }
};

export { shutdown };
