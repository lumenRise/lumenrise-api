import { expect, it } from 'vitest';

import type { LaunchRecord } from '../../src/types/launch/model';
import getLaunchScales from '../../src/utils/launch/getLaunchScales';
import initialLaunchPrice from '../../src/utils/launch/initialLaunchPrice';

const launch = { chain: 'base', assetDecimals: 18, pairDecimals: 6 } as LaunchRecord;

it('keeps asset and pair scales separate from Stellar and from each other', (): void => {
  expect(getLaunchScales(launch)).toEqual({ amountScale: 18, priceScale: 6 });
  expect(getLaunchScales({ ...launch, chain: 'stellar' })).toEqual({
    amountScale: 7,
    priceScale: 7,
  });
});

it('uses native asset decimals for the initial marginal price', (): void => {
  const config = {
    params: {
      curve: {
        virtual_base_reserve: '1000000000000000000000000',
        virtual_quote_reserve: '1000000000000',
      },
    },
  };

  expect(initialLaunchPrice(config, getLaunchScales(launch).amountScale)).toBe('1000000');
  expect(initialLaunchPrice(config)).toBe('1');
});

it('rejects unindexed Base decimals instead of returning a Stellar scale', (): void => {
  expect(() => getLaunchScales({ ...launch, assetDecimals: undefined })).toThrow('reindex');
  expect(() => getLaunchScales({ ...launch, pairDecimals: 19 })).toThrow('invalid');
});
