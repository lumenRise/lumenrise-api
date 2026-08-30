import Session from '../models/Session.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createSessionIndexes: MigrationDefinition = {
  name: '20260922-create-session-indexes',
  up: async () => {
    await Session.createIndexes();
  },
};

export default createSessionIndexes;
