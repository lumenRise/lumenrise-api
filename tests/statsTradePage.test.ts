import { Types } from 'mongoose';
import { expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import LaunchTrade from '../src/models/LaunchTrade';
import getStatsTrades from '../src/services/stats/getStatsTrades';
import getStatsTradePage from '../src/services/stats/getStatsTradePage';
import parseStatsTradeQuery from '../src/utils/stats/parseStatsTradeQuery';

vi.mock('../src/models/Launch', () => ({ default: { find: vi.fn() } }));

vi.mock('../src/models/LaunchTrade', () => ({ default: { find: vi.fn() } }));

it('paginates mixed-chain trades with a stable tie-breaker, native decimals and display-only fields', async (): Promise<void> => {
  const now = new Date('2026-11-01T12:00:00Z');
  const scope = { chain: 'all', network: 'testnet', cursorKey: 'combinedTestnetCursor' } as const;
  const query = { limit: 2, cursors: new Map() };
  const sort = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const select = vi.fn().mockReturnThis();

  const records = [
    {
      _id: new Types.ObjectId('000000000000000000000003'),
      transactionHash: 'a'.repeat(64),
      chain: 'stellar',
      network: 'testnet',
      contractId: 'same',
      trader: 'WALLET',
      tradedAt: now,
      side: 'buy',
      assetAmount: '10000000',
      grossAmount: '12345678',
      executionPrice: '12345678',
    },
    {
      _id: new Types.ObjectId('000000000000000000000002'),
      transactionHash: `0x${'b'.repeat(64)}`,
      chain: 'base',
      network: 'testnet',
      contractId: 'same',
      trader: '0xabc',
      tradedAt: now,
      side: 'sell',
      assetAmount: '2000000000000000000',
      grossAmount: '4000000',
      executionPrice: '2000000',
    },
    {
      _id: new Types.ObjectId('000000000000000000000001'),
      transactionHash: `0x${'c'.repeat(64)}`,
      chain: 'base',
      network: 'testnet',
      contractId: 'same',
      trader: '0xabc',
      tradedAt: now,
      side: 'buy',
      assetAmount: '1',
      grossAmount: '1',
      executionPrice: '1',
    },
  ];

  const launches = [
    {
      chain: 'stellar',
      network: 'testnet',
      contractId: 'same',
      slug: 'stellar-token',
      metadata: { name: 'Stellar Token', symbol: 'ST', logo: '/stellar.png' },
    },
    {
      chain: 'base',
      network: 'testnet',
      contractId: 'same',
      slug: 'base-token',
      metadata: { name: 'Base Token', symbol: 'BT', logo: '/base.png' },
      assetDecimals: 18,
      pairDecimals: 6,
    },
  ];

  vi.mocked(LaunchTrade.find).mockReturnValue({
    sort,
    limit,
    select,
    lean: async () => records,
  } as never);

  vi.mocked(Launch.find).mockReturnValue({
    select: () => ({ lean: async () => launches }),
  } as never);

  const page = await getStatsTradePage(scope, query, now);

  expect(sort).toHaveBeenCalledWith({ tradedAt: -1, _id: -1 });
  expect(limit).toHaveBeenCalledWith(3);
  expect(select).toHaveBeenCalledWith(
    'chain network contractId transactionHash trader tradedAt side assetAmount grossAmount executionPrice',
  );
  expect(page.hasMore).toBe(true);
  expect(page.items).toHaveLength(2);
  expect(page.items[0]).toEqual({
    id: '000000000000000000000003',
    hash: 'a'.repeat(64),
    chain: 'stellar',
    network: 'testnet',
    launch: { slug: 'stellar-token', name: 'Stellar Token', symbol: 'ST', logo: '/stellar.png' },
    trader: 'WALLET',
    tradedAt: now.toISOString(),
    side: 'buy',
    assetAmount: '1',
    price: '1.2345678',
    amount: '1.2345678',
  });
  expect(page.items[1]).toMatchObject({
    hash: `0x${'b'.repeat(64)}`,
    assetAmount: '2',
    price: '2',
    amount: '4',
    launch: { slug: 'base-token' },
  });

  const continuation = parseStatsTradeQuery({ combinedTestnetCursor: page.nextCursor }, now)!;

  records.splice(0, 2);

  const next = await getStatsTradePage(scope, continuation, new Date('2026-11-02T00:00:00Z'));

  expect(LaunchTrade.find).toHaveBeenLastCalledWith({
    chain: { $in: ['stellar', 'base'] },
    network: 'testnet',
    tradedAt: { $lte: now },
    $or: [
      { tradedAt: { $lt: now } },
      { tradedAt: now, _id: { $lt: new Types.ObjectId('000000000000000000000002') } },
    ],
  });
  expect(next.asOf).toBe(now.toISOString());
  expect(next.hasMore).toBe(false);
  expect(next.nextCursor).toBeNull();
  expect(next.items[0]?.assetAmount).toBe('0.000000000000000001');

  const groups = await getStatsTrades(query, now);

  expect(groups.chains).toHaveLength(4);
  expect(groups.combined).toHaveLength(2);

  launches.length = 0;

  await expect(getStatsTradePage(scope, query, now)).rejects.toThrow(
    'Trade display data is invalid',
  );

  records.length = 0;

  const empty = await getStatsTradePage(scope, query, now);

  expect(empty).toMatchObject({ items: [], hasMore: false, nextCursor: null });
});
