import StellarPaymentFact from '../models/StellarPaymentFact.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createStellarPaymentFactIndexes: MigrationDefinition = {
  name: '20260925-create-stellar-payment-fact-indexes',
  up: async () => {
    await StellarPaymentFact.createIndexes();
  },
};

export default createStellarPaymentFactIndexes;
