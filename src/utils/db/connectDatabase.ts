import mongoose from 'mongoose';

import env from '../../env.js';
import log from '../../logger.js';

const connectDatabase = async (): Promise<void> => {
  mongoose.set('autoIndex', env.NODE_ENV !== 'production');

  await mongoose.connect(env.DB_URI, { dbName: env.DB_NAME });

  log.info({ database: env.DB_NAME }, 'Database connected');
};

export { connectDatabase };
