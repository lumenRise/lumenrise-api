import StellarActivityScan from '../models/StellarActivityScan.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createStellarActivityScanIndexes: MigrationDefinition = {
  name: '20260924-create-stellar-activity-scan-indexes',
  up: async () => {
    await StellarActivityScan.createIndexes();
  },
};

export default createStellarActivityScanIndexes;
