import WalletAuthChallenge from '../models/WalletAuthChallenge';
import type { MigrationDefinition } from '../types/database/migration';

const createWalletAuthChallengeIndexes: MigrationDefinition = {
  name: '20260924-create-wallet-auth-challenge-indexes',
  up: async () => {
    await WalletAuthChallenge.createIndexes();
  },
};

export default createWalletAuthChallengeIndexes;
