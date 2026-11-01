import mongoose from 'mongoose';
import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import Launch from '../../src/models/Launch';
import LaunchTrade from '../../src/models/LaunchTrade';
import statsScopes from '../../src/constants/stats/scopes';
import getStatsChart from '../../src/services/stats/getStatsChart';
import getStatsTrades from '../../src/services/stats/getStatsTrades';
import getStatsTradePage from '../../src/services/stats/getStatsTradePage';
import parseStatsTradeQuery from '../../src/utils/stats/parseStatsTradeQuery';

it.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))(
  'paginates actual MongoDB rows across six scopes and produces matching chart totals',
  async (): Promise<void> => {
    const databaseName = `lumenrise_stats_${randomUUID().replaceAll('-', '')}`;
    const now = new Date('2026-11-01T12:00:00Z');

    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5000,
    });

    try {
      await LaunchTrade.createIndexes();

      for (const scope of statsScopes) {
        if (scope.chain === 'all') {
          continue;
        }

        await Launch.collection.insertOne({
          chain: scope.chain,
          network: scope.network,
          contractId: 'same',
          slug: `${scope.chain}-${scope.network}`,
          metadata: { name: 'Example Token', symbol: 'EX', logo: '/token.png' },
          assetDecimals: 18,
          pairDecimals: 6,
          createdAt: now,
        } as never);

        const count = scope.chain === 'stellar' && scope.network === 'testnet' ? 3 : 1;

        for (let index = 0; index < count; index += 1) {
          await LaunchTrade.collection.insertOne({
            chain: scope.chain,
            network: scope.network,
            contractId: 'same',
            transactionHash: `${scope.chain}-${scope.network}-${index}`,
            operationIndex: 0,
            tradedAt: now,
            trader: `${scope.chain}-wallet`,
            side: index % 2 === 0 ? 'buy' : 'sell',
            assetAmount: scope.chain === 'base' ? '1000000000000000000' : '10000000',
            grossAmount: scope.chain === 'base' ? '1000000' : '10000000',
            executionPrice: scope.chain === 'base' ? '1000000' : '10000000',
          } as never);
        }
      }

      const result = await getStatsTrades({ limit: 1, cursors: new Map() }, now);

      expect(result.chains).toHaveLength(4);
      expect(result.combined).toHaveLength(2);

      for (const group of [...result.chains, ...result.combined]) {
        expect(group.items).toHaveLength(1);
        expect(group.items[0]?.network).toBe(group.network);
        expect(group.items[0]?.amount).toBe('1');
        expect(group.items[0]?.assetAmount).toBe('1');

        if (group.chain !== 'all') {
          expect(group.items[0]?.chain).toBe(group.chain);
        }
      }

      const scope = statsScopes[4]!;
      const seen = new Set<string>();
      let page = result.combined[0]!;

      for (let index = 0; index < 4; index += 1) {
        const item = page.items[0]!;

        expect(seen.has(item.id)).toBe(false);

        seen.add(item.id);

        if (!page.nextCursor) {
          break;
        }

        const query = parseStatsTradeQuery(
          { limit: '1', combinedTestnetCursor: page.nextCursor },
          now,
        )!;

        page = await getStatsTradePage(scope, query, now);
      }

      expect(seen.size).toBe(4);
      expect(page.nextCursor).toBeNull();

      const future = new Date(now.getTime() + 60_000);

      await LaunchTrade.collection.insertOne({
        chain: 'stellar',
        network: 'testnet',
        contractId: 'same',
        transactionHash: 'future',
        operationIndex: 0,
        tradedAt: future,
        trader: 'future-wallet',
        side: 'buy',
        assetAmount: '1',
        grossAmount: '1',
        executionPrice: '1',
      } as never);

      const cursorQuery = parseStatsTradeQuery(
        { limit: '100', combinedTestnetCursor: result.combined[0]!.nextCursor },
        future,
      )!;
      const continuation = await getStatsTradePage(scope, cursorQuery, future);

      expect(continuation.items).toHaveLength(3);
      expect(continuation.asOf).toBe(now.toISOString());

      const chart = await getStatsChart(
        {
          from: new Date('2026-11-01T00:00:00Z'),
          to: new Date(now.getTime() + 1),
          interval: 'day',
        },
        future,
      );

      expect(chart.combined[0]?.items[0]).toMatchObject({
        launchCount: 2,
        tradeCount: 4,
        volume: '8',
        participantCount: 2,
      });
      expect(chart.combined[1]?.items[0]).toMatchObject({
        launchCount: 2,
        tradeCount: 2,
        volume: '4',
        participantCount: 2,
      });
    } finally {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);
