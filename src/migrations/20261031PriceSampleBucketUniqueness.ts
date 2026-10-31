import LaunchPriceSample from '../models/LaunchPriceSample';
import type { MigrationDefinition } from '../types/database/migration';

const priceSampleBucketUniqueness: MigrationDefinition = {
  name: '20261031-price-sample-bucket-uniqueness',
  up: async (): Promise<void> => {
    try {
      await LaunchPriceSample.collection.dropIndex('launch_price_samples_bucket_unique_chain');
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 27) {
        throw error;
      }
    }
  },
};

export default priceSampleBucketUniqueness;
