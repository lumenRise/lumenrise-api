import LaunchPriceSample from '../models/LaunchPriceSample';
import type { MigrationDefinition } from '../types/database/migration';

const priceObservationIndexes: MigrationDefinition = {
  name: '20261014-price-observation-indexes',
  up: async () => {
    await LaunchPriceSample.createIndexes();
  },
};

export default priceObservationIndexes;
