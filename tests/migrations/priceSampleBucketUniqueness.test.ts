import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaunchPriceSample from '../../src/models/LaunchPriceSample';
import priceSampleBucketUniqueness from '../../src/migrations/20261031PriceSampleBucketUniqueness';

vi.mock('../../src/models/LaunchPriceSample', () => ({
  default: { collection: { dropIndex: vi.fn() } },
}));

describe('price sample bucket uniqueness migration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('drops the legacy unique bucket index so observations stay unique by observationKey', async () => {
    await priceSampleBucketUniqueness.up();

    expect(LaunchPriceSample.collection.dropIndex).toHaveBeenCalledWith(
      'launch_price_samples_bucket_unique_chain',
    );
  });

  it('can resume when the legacy index was already removed', async () => {
    vi.mocked(LaunchPriceSample.collection.dropIndex).mockRejectedValue({ code: 27 });

    await expect(priceSampleBucketUniqueness.up()).resolves.toBeUndefined();
  });

  it('does not ignore database errors while removing the old index', async () => {
    vi.mocked(LaunchPriceSample.collection.dropIndex).mockRejectedValue({ code: 13 });

    await expect(priceSampleBucketUniqueness.up()).rejects.toEqual({ code: 13 });
  });
});
