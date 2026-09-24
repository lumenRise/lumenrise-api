import mongoose from 'mongoose';

import log from '../../logger.js';

const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();

  log.info('Database disconnected');
};

export { disconnectDatabase };
