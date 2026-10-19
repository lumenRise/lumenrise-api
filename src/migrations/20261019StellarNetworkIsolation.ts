import env from '../env';
import StellarPaymentFact from '../models/StellarPaymentFact';
import StellarActivityScan from '../models/StellarActivityScan';
import getNetworkConfig from '../services/network/getNetworkConfig';
import type { MigrationDefinition } from '../types/database/migration';
import SorobanTransactionEvidence from '../models/SorobanTransactionEvidence';

const stellarNetworkIsolation: MigrationDefinition = {
  name: '20261019-stellar-network-isolation',
  up: async (): Promise<void> => {
    const networks = ['testnet', 'public'] as const;
    const legacyNetwork = env.STELLAR_LEGACY_NETWORK;
    const missingNetwork = { network: { $exists: false } };
    const sourceUrls = await StellarActivityScan.collection.distinct('sourceUrl', missingNetwork);
    const mappings = new Map<string, 'testnet' | 'public'>();

    for (const sourceUrl of sourceUrls) {
      const matches = networks.filter((network) =>
        [
          getNetworkConfig(network).horizonUrl.replace(/\/$/, ''),
          network === 'testnet'
            ? 'https://horizon-testnet.stellar.org'
            : 'https://horizon.stellar.org',
        ].includes(sourceUrl.replace(/\/$/, '')),
      );

      const network = matches.length === 1 ? matches[0] : legacyNetwork;

      if (!network) {
        throw new Error(
          'Cannot identify legacy Stellar network; configure STELLAR_LEGACY_NETWORK before migrating',
        );
      }

      mappings.set(sourceUrl, network);
    }

    for (const model of [StellarPaymentFact, SorobanTransactionEvidence]) {
      const [orphan] = await model.collection
        .aggregate([
          { $match: missingNetwork },
          {
            $lookup: {
              from: StellarActivityScan.collection.name,
              localField: 'scan',
              foreignField: '_id',
              as: 'parent',
            },
          },
          { $match: { 'parent.0': { $exists: false } } },
          { $limit: 1 },
        ])
        .toArray();

      if (orphan) {
        throw new Error(
          'Legacy Stellar evidence has no parent scan; repair orphan records before migrating',
        );
      }
    }

    for (const [sourceUrl, network] of mappings) {
      await StellarActivityScan.collection.updateMany(
        { ...missingNetwork, sourceUrl },
        { $set: { network } },
      );
    }

    for await (const scan of StellarActivityScan.collection.find(
      {},
      { projection: { network: 1 } },
    )) {
      if (scan.network !== 'testnet' && scan.network !== 'public') {
        throw new Error('Invalid stored Stellar scan network');
      }

      for (const model of [StellarPaymentFact, SorobanTransactionEvidence]) {
        if (
          await model.collection.findOne({
            scan: scan._id,
            network: { $exists: true, $ne: scan.network },
          })
        ) {
          throw new Error('Stored Stellar evidence network differs from parent scan');
        }

        await model.collection.updateMany(
          { scan: scan._id, ...missingNetwork },
          { $set: { network: scan.network } },
        );
      }
    }

    // Replace the former identity-wide uniqueness only after the network backfill.
    await StellarActivityScan.createIndexes();
    await StellarPaymentFact.createIndexes();
    await SorobanTransactionEvidence.createIndexes();

    const indexes = await StellarActivityScan.collection.indexes();

    if (indexes.some((index) => index.name === 'stellar_activity_one_active_per_identity')) {
      await StellarActivityScan.collection.dropIndex('stellar_activity_one_active_per_identity');
    }
  },
};

export default stellarNetworkIsolation;
