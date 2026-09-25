import type { MigrationDefinition } from '../types/database/migration.js';
import SorobanTransactionEvidence from '../models/SorobanTransactionEvidence.js';

const createSorobanEvidenceIndexes: MigrationDefinition = {
  name: '20260926-create-soroban-evidence-indexes',
  up: async () => {
    await SorobanTransactionEvidence.createIndexes();
  },
};

export default createSorobanEvidenceIndexes;
