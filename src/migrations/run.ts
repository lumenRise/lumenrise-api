import log from '../logger.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import runDatabaseMigrations from './runDatabaseMigrations.js';

const runMigrations = async (): Promise<void> => {
  await connectDatabase();

  try {
    await runDatabaseMigrations();
  } finally {
    await disconnectDatabase();
  }
};

void runMigrations().catch((error: unknown) => {
  log.fatal({ error }, 'Database migration failed');
  process.exitCode = 1;
});
