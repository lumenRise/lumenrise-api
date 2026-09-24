import WalletAuthChallenge from '../models/WalletAuthChallenge.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createWalletAuthChallengeIndexes: MigrationDefinition = {
  name: '20260924-create-wallet-auth-challenge-indexes',
  up: async () => {
    await WalletAuthChallenge.createIndexes();
  },
};

export default createWalletAuthChallengeIndexes;
