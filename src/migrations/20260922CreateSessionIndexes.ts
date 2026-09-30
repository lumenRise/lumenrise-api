import Session from '../models/Session';
import type { MigrationDefinition } from '../types/database/migration';
const createSessionIndexes: MigrationDefinition = {
  name: '20260922-create-session-indexes',
  up: async () => {
    await Session.createIndexes();
  },
};

export default createSessionIndexes;
