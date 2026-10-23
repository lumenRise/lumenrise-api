import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import Launch from '../../src/models/Launch';
import LaunchTrade from '../../src/models/LaunchTrade';
import type { LaunchListPage, LaunchListQuery } from '../../src/types/launch/list';
import buildLaunchListPipeline from '../../src/utils/launch/buildLaunchListPipeline';

const now = new Date('2026-10-19T12:00:00Z');
const seconds = Math.floor(now.getTime() / 1000);
const owner = Keypair.random().publicKey();
const otherOwner = Keypair.random().publicKey();
const pair = StrKey.encodeContract(Buffer.alloc(32, 80));
const otherPair = StrKey.encodeContract(Buffer.alloc(32, 81));
const ids = Array.from({ length: 8 }, (_, index) =>
  StrKey.encodeContract(Buffer.alloc(32, index + 1)),
);

const baseQuery: LaunchListQuery = {
  network: 'testnet',
  category: 'all',
  sort: 'newest',
  direction: 'desc',
  page: 1,
  limit: 20,
};

const databaseName = `lumenrise_launch_list_${randomUUID().replaceAll('-', '')}`;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('global launch listing', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5000,
    });

    await Launch.collection.insertMany(
      ids.map((contractId, index) => ({
        network: index === 7 ? 'public' : 'testnet',
        factoryContractId: ids[0],
        factoryIndex: index + 1,
        contractId,
        owner: index === 6 ? otherOwner : owner,
        pair: index === 5 ? otherPair : pair,
        asset: ids[0],
        metadata: {
          name: index === 0 ? 'A.* literal' : `Project ${index}`,
          symbol: `TOKEN${index}`,
        },
        createdAt: index === 4 ? null : new Date(now.getTime() - (8 - index) * 60_000),
        observedAt: now,
        stateObservedAt: now,
        stateAsOfLedger: 1,
        asOfLedger: 1,
        config: {
          params: {
            starts_at: String(index === 0 ? seconds + 14 * 86_400 : seconds - 100),
            ...(index === 6 ? {} : { ends_at: String(index === 3 ? seconds - 1 : seconds + 100) }),
            curve: { graduation_target: index === 4 ? '0' : '1000' },
          },
        },
        state: {
          graduated: index === 2,
          quote_reserve: index === 1 ? '950' : '500',
          buyer_count: index,
        },
      })),
    );

    const trades = [
      [0, '9999', -100],
      [1, '100', -100],
      [1, '100', -200],
      [1, '100', -86_400],
      [1, '9007199254740993', -86_401],
      [1, '999999', 1],
      [2, '50', -100],
      [2, '50', -200],
      [2, '50', -300],
      [2, '50', -400],
      [3, '20', -100],
      [3, '20', -200],
      [5, '99999999', -100],
      [6, '150', -100],
    ];

    await LaunchTrade.collection.insertMany(
      trades.map(([index, gross, offset], position) => ({
        network: 'testnet',
        contractId: ids[Number(index)],
        transactionHash: String(position),
        tradedAt: new Date(now.getTime() + Number(offset) * 1000),
        side: position % 2 === 0 ? 'buy' : 'sell',
        grossAmount: String(gross),
        assetAmount: '10',
      })),
    );
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  it('orders by creation time globally, independently of trading start, with unknown dates last', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, limit: 2 }, now),
    );

    expect(page?.launches.map((launch) => launch.contractId)).toEqual([ids[6], ids[5]]);
    expect(page?.total).toEqual([{ count: 7 }]);

    const [ascending] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, direction: 'asc' }, now),
    );

    expect(ascending?.launches[0]?.contractId).toBe(ids[0]);
    expect(ascending?.launches.at(-1)?.contractId).toBe(ids[4]);
  });

  it('searches both fields case-insensitively and treats regex characters literally', async () => {
    const [literal] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, search: 'a.*' }, now),
    );
    const [symbol] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, search: 'token1' }, now),
    );

    expect(literal?.launches.map((launch) => launch.contractId)).toEqual([ids[0]]);
    expect(literal?.total).toEqual([{ count: 1 }]);
    expect(symbol?.launches.map((launch) => launch.contractId)).toEqual([ids[1]]);
  });

  it('ranks trades in the rolling window before pagination and returns matching totals', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, sort: 'trending', limit: 1, page: 2 }, now),
    );

    expect(page?.launches[0]?.contractId).toBe(ids[1]);
    expect(page?.launches[0]?.volume24h).toEqual({
      tradeCount: 3,
      buyCount: 1,
      sellCount: 2,
      grossPairAmount: '300',
      assetAmount: '30',
    });
    expect(page?.launches[0]?.volumeTotal).toEqual({
      tradeCount: 4,
      buyCount: 2,
      sellCount: 2,
      grossPairAmount: '9007199254741293',
      assetAmount: '40',
    });
    expect(page?.total).toEqual([{ count: 7 }]);
  });

  it('returns zero total volume for launches without recorded trades', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, search: 'token4' }, now),
    );

    expect(page?.launches[0]?.volumeTotal).toEqual({
      grossPairAmount: '0',
      assetAmount: '0',
      tradeCount: 0,
      buyCount: 0,
      sellCount: 0,
    });
  });

  it('includes only open ungraduated curves with positive targets, including contracts without expiry', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, sort: 'almostGraduated' }, now),
    );

    expect(page?.launches[0]?.contractId).toBe(ids[1]);
    expect(page?.launches.map((launch) => launch.contractId).sort()).toEqual(
      [ids[1], ids[5], ids[6]].sort(),
    );
    expect(page?.total).toEqual([{ count: 3 }]);
  });

  it('keeps payment assets separate for top volume and preserves owner/network filters', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline({ ...baseQuery, sort: 'topVolume', pair, owner }, now),
    );

    expect(page?.launches[0]?.contractId).toBe(ids[0]);
    expect(
      page?.launches.every(
        (launch) => launch.pair === pair && launch.owner === owner && launch.network === 'testnet',
      ),
    ).toBe(true);
    expect(page?.total).toEqual([{ count: 5 }]);
  });

  it.each(['auction', 'pre-sale'] as const)(
    'returns empty pages and zero matches for unavailable category %s',
    async (category) => {
      const [page] = await Launch.aggregate<LaunchListPage>(
        buildLaunchListPipeline({ ...baseQuery, category }, now),
      );

      expect(page).toEqual({ launches: [], total: [] });
    },
  );

  it('sorts names before selecting the page', async () => {
    const [page] = await Launch.aggregate<LaunchListPage>(
      buildLaunchListPipeline(
        { ...baseQuery, sort: 'name', direction: 'asc', page: 2, limit: 2 },
        now,
      ),
    );

    expect(page?.launches.map((launch) => launch.contractId)).toEqual([ids[2], ids[3]]);
  });
});
