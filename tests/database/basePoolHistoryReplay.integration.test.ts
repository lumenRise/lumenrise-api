import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import Launch from '../../src/models/Launch';
import EvmAccount from '../../src/models/EvmAccount';
import BaseCursor from '../../src/models/BaseCursor';
import LaunchTrade from '../../src/models/LaunchTrade';
import LaunchTeamMember from '../../src/models/LaunchTeamMember';
import LaunchPriceSample from '../../src/models/LaunchPriceSample';
import statsTradeIndexes from '../../src/migrations/20261101StatsTradeIndexes';
import createCurrentIndexes from '../../src/migrations/20261012CreateCurrentIndexes';
import basePoolHistoryReplay from '../../src/migrations/20261101BasePoolHistoryReplay';

const databaseName = `base_pool_replay_${randomUUID().replaceAll('-', '')}`;
const network = 'testnet' as const;
const factoryAddress = '0xfea0f9ba54ea917491db9a946750fadf6bf8a5de';
const graduatedContractId = '0xa93c2b6f8b7bc691bacd613742530763cf811499';
const scope = { network, factoryAddress };
const identity = { chain: 'base' as const, network, contractId: graduatedContractId };
const previousBlockHash = `0x${'a'.repeat(64)}`;
const lastScannedAt = new Date('2026-11-01T12:00:00Z');

const cursor = {
  ...scope,
  nextBlock: '53210001',
  nextLiveBlock: '53220001',
  historyEndBlock: '53190000',
  previousBlockHash,
  lastScannedAt,
  lastLiveScannedAt: lastScannedAt,
  leaseOwner: null,
  leaseUntil: null,
};

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))(
  'Base pool replay migration',
  (): void => {
    beforeAll(async (): Promise<void> => {
      mongoose.set('autoIndex', false);

      await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 5000,
      });

      await BaseCursor.createIndexes();
    });

    beforeEach(async (): Promise<void> => {
      await Promise.all([
        Launch.deleteMany({}),
        BaseCursor.deleteMany({}),
        LaunchTrade.deleteMany({}),
        LaunchPriceSample.deleteMany({}),
      ]);

      await BaseCursor.create(cursor);

      await Launch.collection.insertOne({
        ...identity,
        factoryContractId: factoryAddress,
        stateAsOfLedger: 53220000,
        state: { graduated: true },
      } as never);

      await LaunchTrade.collection.insertOne({ ...identity, ledger: 52986000 } as never);

      await LaunchPriceSample.collection.insertMany([
        { ...identity, ledger: 52985800, price: '10' },
        { ...identity, ledger: 52985801, price: '11' },
        { ...identity, ledger: 53000000, price: '12' },
        { ...identity, ledger: 53230000, price: '13' },
        { ...identity, network: 'public', ledger: 53000000, price: '14' },
        { ...identity, chain: 'stellar', ledger: 53000000, price: '15' },
        {
          ...identity,
          contractId: '0x1111111111111111111111111111111111111111',
          ledger: 53000000,
          price: '16',
        },
      ] as never);
    });

    afterAll(async (): Promise<void> => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    it('keeps consolidated baseline indexes and installs pending trade and pool lookup indexes', async (): Promise<void> => {
      await createCurrentIndexes.up();
      await statsTradeIndexes.up();

      expect(createCurrentIndexes.name).toBe('20261012-create-current-indexes');
      expect((await EvmAccount.collection.indexes()).length).toBeGreaterThan(1);
      expect((await LaunchTeamMember.collection.indexes()).length).toBeGreaterThan(1);
      expect((await Launch.collection.indexes()).map((index) => index.name)).toContain(
        'launches_base_pool_lookup',
      );
      expect((await LaunchTrade.collection.indexes()).map((index) => index.name)).toEqual(
        expect.arrayContaining([
          'launch_trades_stats_chain_time',
          'launch_trades_stats_network_time',
        ]),
      );
    });

    it('rewinds only history, covers both scan positions and removes only affected derived prices', async (): Promise<void> => {
      await basePoolHistoryReplay.up();

      const updated = await BaseCursor.findOne(scope).lean();

      expect(updated).toMatchObject({
        nextBlock: '52985700',
        historyEndBlock: '53220000',
        nextLiveBlock: cursor.nextLiveBlock,
        lastLiveScannedAt: cursor.lastLiveScannedAt,
        previousBlockHash: null,
        lastScannedAt: null,
      });

      expect(await LaunchTrade.countDocuments()).toBe(1);
      expect(await LaunchPriceSample.countDocuments()).toBe(5);
      expect(
        await LaunchPriceSample.countDocuments({
          ...identity,
          ledger: { $gte: 52985801, $lte: 53220000 },
        }),
      ).toBe(0);
      expect((await Launch.findOne(identity).lean())?.stateAsOfLedger).toBe(53220000);
    });

    it('preserves an earlier unfinished history cursor and its hash', async (): Promise<void> => {
      await BaseCursor.updateOne(scope, {
        $set: { nextBlock: '52500000', historyEndBlock: '53225000' },
      });

      await basePoolHistoryReplay.up();

      expect(await BaseCursor.findOne(scope).lean()).toMatchObject({
        nextBlock: '52500000',
        previousBlockHash,
        lastScannedAt,
        historyEndBlock: '53225000',
        nextLiveBlock: cursor.nextLiveBlock,
      });
    });

    it('refuses an active writer and rolls back every change', async (): Promise<void> => {
      await BaseCursor.updateOne(scope, {
        $set: { leaseOwner: 'active-worker', leaseUntil: new Date(Date.now() + 300000) },
      });

      await expect(basePoolHistoryReplay.up()).rejects.toThrow('idle writer');

      expect(await BaseCursor.findOne(scope).lean()).toMatchObject({
        nextBlock: cursor.nextBlock,
        historyEndBlock: cursor.historyEndBlock,
        nextLiveBlock: cursor.nextLiveBlock,
      });

      expect(await LaunchPriceSample.countDocuments()).toBe(7);
    });

    it('does not touch a different factory or a database without the target cursor', async (): Promise<void> => {
      await BaseCursor.deleteMany({});

      const other = await BaseCursor.create({
        ...cursor,
        factoryAddress: '0x2222222222222222222222222222222222222222',
      });

      await basePoolHistoryReplay.up();

      expect(await BaseCursor.findById(other._id).lean()).toMatchObject({
        nextBlock: cursor.nextBlock,
        historyEndBlock: cursor.historyEndBlock,
      });

      expect(await LaunchPriceSample.countDocuments()).toBe(7);
    });
  },
);
