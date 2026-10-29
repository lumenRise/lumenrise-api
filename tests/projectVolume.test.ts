import { beforeEach, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import LaunchTrade from '../src/models/LaunchTrade';
import getProjectVolume from '../src/services/stats/getProjectVolume';

vi.mock('../src/models/Launch', () => ({ default: { find: vi.fn() } }));

vi.mock('../src/models/LaunchTrade', () => ({ default: { find: vi.fn() } }));

const now = new Date('2026-10-29T12:00:00Z');
const close = vi.fn();

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(Launch.find).mockReturnValue({
    select: () => ({
      lean: async () => [
        { chain: 'stellar', contractId: 'stellar-curve' },
        { chain: 'base', contractId: 'base-curve', assetDecimals: 18, pairDecimals: 6 },
      ],
    }),
  } as never);
});

it('combines native decimals exactly, doubles amounts and keeps real counts and the 24h boundary', async (): Promise<void> => {
  const records = [
    {
      contractId: 'stellar-curve',
      grossAmount: '12345678',
      tradedAt: new Date('2026-10-28T12:00:00Z'),
      side: 'buy',
    },
    {
      chain: 'base',
      contractId: 'base-curve',
      grossAmount: '2000001',
      tradedAt: now,
      side: 'sell',
    },
    {
      chain: 'base',
      contractId: 'base-curve',
      grossAmount: '9007199254740993000000',
      tradedAt: new Date('2026-10-28T11:59:59Z'),
      side: 'buy',
    },
  ];

  const cursor = { [Symbol.asyncIterator]: () => records.values(), close };

  vi.mocked(LaunchTrade.find).mockReturnValue({
    select: () => ({ lean: () => ({ cursor: () => cursor }) }),
  } as never);

  const result = await getProjectVolume('public', now);

  expect(Launch.find).toHaveBeenCalledWith({ network: 'public' });
  expect(LaunchTrade.find).toHaveBeenCalledWith({ network: 'public', tradedAt: { $lte: now } });
  expect(result).toMatchObject({
    network: 'public',
    currency: 'USDC',
    multiplier: 2,
    volumeTotal: { amount: '18014398509481992.4691376', tradeCount: 3, buyCount: 2, sellCount: 1 },
    volume24h: { amount: '6.4691376', tradeCount: 2, buyCount: 1, sellCount: 1 },
  });
  expect(close).toHaveBeenCalledOnce();
});

it('returns zero volumes for an empty network', async (): Promise<void> => {
  const cursor = { [Symbol.asyncIterator]: () => [].values(), close };

  vi.mocked(LaunchTrade.find).mockReturnValue({
    select: () => ({ lean: () => ({ cursor: () => cursor }) }),
  } as never);

  const result = await getProjectVolume('testnet', now);

  expect(result.volumeTotal).toEqual({ amount: '0', tradeCount: 0, buyCount: 0, sellCount: 0 });
  expect(result.volume24h).toEqual(result.volumeTotal);
});

it('closes the cursor and fails instead of guessing decimals for an orphaned trade', async (): Promise<void> => {
  const records = [
    { chain: 'base', contractId: 'missing-curve', grossAmount: '100', tradedAt: now, side: 'buy' },
  ];
  const cursor = { [Symbol.asyncIterator]: () => records.values(), close };

  vi.mocked(LaunchTrade.find).mockReturnValue({
    select: () => ({ lean: () => ({ cursor: () => cursor }) }),
  } as never);

  await expect(getProjectVolume('testnet', now)).rejects.toThrow('denomination');
  expect(close).toHaveBeenCalledOnce();
});
