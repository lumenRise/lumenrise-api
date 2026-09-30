import mongoose from 'mongoose';

import log from '../../logger';
const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();

  log.info('Database disconnected');
};

export { disconnectDatabase };
