import StellarActivityScan from '../models/StellarActivityScan';
import type { MigrationDefinition } from '../types/database/migration';

const createStellarActivityScanIndexes: MigrationDefinition = {
  name: '20260924-create-stellar-activity-scan-indexes',
  up: async () => {
    await StellarActivityScan.createIndexes();
  },
};

export default createStellarActivityScanIndexes;
