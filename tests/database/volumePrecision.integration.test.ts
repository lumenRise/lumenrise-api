import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import Launch from '../../src/models/Launch';
import LaunchTrade from '../../src/models/LaunchTrade';
import toLaunchVolume from '../../src/utils/launch/toLaunchVolume';
import buildLaunchListPipeline from '../../src/utils/launch/buildLaunchListPipeline';
import buildLaunchVolumePipeline from '../../src/utils/launch/buildLaunchVolumePipeline';

const databaseName = `lumenrise_volume_audit_${randomUUID().replaceAll('-', '')}`;
const now = new Date('2026-10-30T12:00:00Z');
const maximum = 2n ** 128n - 1n;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))(
  'exact integer volume aggregation',
  (): void => {
    beforeAll(async (): Promise<void> => {
      await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 5000,
      });

      await Promise.all([Launch.createIndexes(), LaunchTrade.createIndexes()]);

      await LaunchTrade.collection.insertMany([
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'curve',
          transactionHash: 'history',
          operationIndex: 0,
          grossAmount: maximum.toString(),
          assetAmount: maximum.toString(),
          side: 'buy',
          tradedAt: new Date(now.getTime() - 25 * 3_600_000),
        },
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'curve',
          transactionHash: 'current-sell',
          operationIndex: 0,
          grossAmount: maximum.toString(),
          assetAmount: maximum.toString(),
          side: 'sell',
          tradedAt: now,
        },
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'curve',
          transactionHash: 'current-buy',
          operationIndex: 0,
          grossAmount: '1',
          assetAmount: '1',
          side: 'buy',
          tradedAt: now,
        },
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'curve',
          transactionHash: 'future',
          operationIndex: 0,
          grossAmount: maximum.toString(),
          assetAmount: maximum.toString(),
          side: 'buy',
          tradedAt: new Date(now.getTime() + 3_600_000),
        },
      ]);
    });

    afterAll(async (): Promise<void> => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    it('preserves all uint128 digits, carries between limbs and excludes future trades', async (): Promise<void> => {
      const [result] = await LaunchTrade.aggregate([
        { $match: { contractId: 'curve' } },
        ...buildLaunchVolumePipeline(now),
      ]);

      expect(toLaunchVolume(result.volumeTotal)).toEqual({
        grossPairAmount: ((maximum * 2n + 1n) * 2n).toString(),
        assetAmount: (maximum * 2n + 1n).toString(),
        tradeCount: 3,
        buyCount: 2,
        sellCount: 1,
      });
      expect(toLaunchVolume(result.volume24h)).toEqual({
        grossPairAmount: ((maximum + 1n) * 2n).toString(),
        assetAmount: (maximum + 1n).toString(),
        tradeCount: 2,
        buyCount: 1,
        sellCount: 1,
      });
    });

    it('ranks volumes differing only in their final digit exactly', async (): Promise<void> => {
      await Launch.collection.insertMany([
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'a-small',
          factoryContractId: 'factory',
          factoryIndex: 1,
          pair: 'pair',
          metadata: { name: 'Small', symbol: 'SMALL' },
        },
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'z-large',
          factoryContractId: 'factory',
          factoryIndex: 2,
          pair: 'pair',
          metadata: { name: 'Large', symbol: 'LARGE' },
        },
      ]);

      await LaunchTrade.collection.insertMany([
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'a-small',
          transactionHash: 'rank-small',
          operationIndex: 0,
          grossAmount: (maximum - 1n).toString(),
          assetAmount: '1',
          side: 'buy',
          tradedAt: now,
        },
        {
          chain: 'base',
          network: 'testnet',
          contractId: 'z-large',
          transactionHash: 'rank-large',
          operationIndex: 0,
          grossAmount: maximum.toString(),
          assetAmount: '1',
          side: 'buy',
          tradedAt: now,
        },
      ]);

      const [result] = await Launch.aggregate(
        buildLaunchListPipeline(
          {
            chain: 'base',
            network: 'testnet',
            pair: 'pair',
            category: 'all',
            sort: 'topVolume',
            direction: 'desc',
            page: 1,
            limit: 20,
          },
          now,
        ),
      );

      expect(
        result.launches.map((launch: { contractId: string }): string => launch.contractId),
      ).toEqual(['z-large', 'a-small']);
    });

    it('formats zero volume when the complete history is outside the 24h window', async (): Promise<void> => {
      const [result] = await LaunchTrade.aggregate(
        buildLaunchVolumePipeline(new Date(now.getTime() + 48 * 3_600_000)),
      );

      expect(toLaunchVolume(result.volume24h)).toEqual({
        grossPairAmount: '0',
        assetAmount: '0',
        tradeCount: 0,
        buyCount: 0,
        sellCount: 0,
      });
    });
  },
);
