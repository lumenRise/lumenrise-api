import { afterEach, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import LaunchName from '../../src/models/LaunchName';
import TokenImage from '../../src/models/TokenImage';
import EvmAccount from '../../src/models/EvmAccount';
import BaseCursor from '../../src/models/BaseCursor';
import LaunchTrade from '../../src/models/LaunchTrade';
import LaunchHolder from '../../src/models/LaunchHolder';
import FactoryCursor from '../../src/models/FactoryCursor';
import PrivyIdentity from '../../src/models/PrivyIdentity';
import BaseCheckpoint from '../../src/models/BaseCheckpoint';
import LaunchTeamMember from '../../src/models/LaunchTeamMember';
import LaunchPriceSample from '../../src/models/LaunchPriceSample';
import LaunchHolderRefreshJob from '../../src/models/LaunchHolderRefreshJob';
import launchChainIsolation from '../../src/migrations/20261028LaunchChainIsolation';

const models = [
  Launch,
  LaunchName,
  TokenImage,
  LaunchTrade,
  LaunchHolder,
  FactoryCursor,
  LaunchPriceSample,
  LaunchTeamMember,
  LaunchHolderRefreshJob,
];

afterEach((): void => {
  vi.restoreAllMocks();
});

it('backfills missing chain fields only and replaces indexes before dropping legacy constraints', async (): Promise<void> => {
  for (const model of models) {
    vi.spyOn(model.collection, 'updateMany').mockResolvedValue({} as never);

    vi.spyOn(model, 'createIndexes').mockResolvedValue([]);

    vi.spyOn(model.collection, 'indexes').mockResolvedValue(
      model.schema
        .indexes()
        .filter(([keys]) => 'chain' in keys)
        .map(([keys, options]) => ({
          name: options.name!.slice(0, -6),
          key: Object.fromEntries(Object.entries(keys).filter(([key]) => key !== 'chain')),
        })) as never,
    );

    vi.spyOn(model.collection, 'dropIndex').mockResolvedValue({} as never);
  }

  for (const model of [EvmAccount, PrivyIdentity, BaseCursor, BaseCheckpoint]) {
    vi.spyOn(model, 'createIndexes').mockResolvedValue([]);
  }

  await launchChainIsolation.up();

  await launchChainIsolation.up();

  for (const model of models) {
    expect(model.collection.updateMany).toHaveBeenCalledWith(
      { chain: { $exists: false } },
      { $set: { chain: 'stellar' } },
    );

    expect(vi.mocked(model.createIndexes).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(model.collection.dropIndex).mock.invocationCallOrder[0]!,
    );

    expect(model.collection.updateMany).toHaveBeenCalledTimes(2);
  }
});

it('preserves the same contract and slug in different chain/network index scopes', (): void => {
  const indexes = Launch.schema.indexes();
  const contract = indexes.find(([, options]) => options.name === 'launches_contract_unique_chain');
  const slug = indexes.find(([, options]) => options.name === 'launches_slug_unique_chain');

  expect(contract?.[0]).toEqual({ chain: 1, network: 1, contractId: 1 });

  expect(slug?.[0]).toEqual({ chain: 1, network: 1, slug: 1 });
});
