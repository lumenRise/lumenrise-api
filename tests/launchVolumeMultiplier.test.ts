import { formatUnits } from 'viem';
import { expect, it } from 'vitest';

import toLaunchVolume from '../src/utils/launch/toLaunchVolume';

it.each([
  ['base', 6],
  ['stellar', 7],
] as const)('returns four USDC for a one-USDC buy and sell on %s', (_chain, scale): void => {
  const volume = toLaunchVolume({
    grossPairAmount: (2n * 10n ** BigInt(scale)).toString(),
    assetAmount: '2',
    tradeCount: 2,
    buyCount: 1,
    sellCount: 1,
  });

  expect(formatUnits(BigInt(volume.grossPairAmount), scale)).toBe('4');
  expect(volume.assetAmount).toBe('2');
  expect(volume.tradeCount).toBe(2);
});
