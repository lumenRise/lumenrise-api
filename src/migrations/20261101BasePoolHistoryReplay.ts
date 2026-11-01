import mongoose from 'mongoose';

import Launch from '../models/Launch';
import BaseCursor from '../models/BaseCursor';
import LaunchPriceSample from '../models/LaunchPriceSample';
import type { MigrationDefinition } from '../types/database/migration';

const basePoolHistoryReplay: MigrationDefinition = {
  name: '20261101-base-pool-history-replay',
  up: async (): Promise<void> => {
    await mongoose.connection.transaction(async (session): Promise<void> => {
      const network = 'testnet' as const;
      const factoryAddress = '0xfea0f9ba54ea917491db9a946750fadf6bf8a5de';
      const fromBlock = 52_985_700n;
      const graduatedContractId = '0xa93c2b6f8b7bc691bacd613742530763cf811499';
      const graduationBlock = 52_985_801;
      const scope = { network, factoryAddress };
      const cursor = await BaseCursor.findOne(scope).session(session).lean();

      if (!cursor) {
        return;
      }

      const nextBlock = BigInt(cursor.nextBlock);
      const nextLiveBlock = BigInt(cursor.nextLiveBlock ?? cursor.nextBlock);
      let historyEndBlock = BigInt(cursor.historyEndBlock ?? '0');

      for (const boundary of [nextBlock - 1n, nextLiveBlock - 1n]) {
        if (boundary > historyEndBlock) {
          historyEndBlock = boundary;
        }
      }

      if (historyEndBlock < fromBlock) {
        return;
      }

      const rewind = nextBlock > fromBlock;

      const updated = await BaseCursor.updateOne(
        {
          ...scope,
          nextBlock: cursor.nextBlock,
          $or: [{ leaseUntil: null }, { leaseUntil: { $lte: new Date() } }],
        },
        {
          $set: {
            nextBlock: (rewind ? fromBlock : nextBlock).toString(),
            historyEndBlock: historyEndBlock.toString(),
            ...(rewind ? { previousBlockHash: null, lastScannedAt: null } : {}),
          },
        },
        { session },
      );

      if (updated.matchedCount !== 1) {
        throw new Error(
          'Base pool history replay requires an idle writer; stop the launch worker and retry migration',
        );
      }

      const launch = await Launch.findOne({
        chain: 'base',
        network,
        factoryContractId: factoryAddress,
        contractId: graduatedContractId,
      })
        .session(session)
        .lean();

      if (!launch) {
        return;
      }

      // These derived samples were read from the curve after its verified graduation.
      // Replay rebuilds the pool prices without deleting any trades or launch state.
      await LaunchPriceSample.deleteMany(
        {
          chain: 'base',
          network,
          contractId: graduatedContractId,
          ledger: { $gte: graduationBlock, $lte: Number(historyEndBlock) },
        },
        { session },
      );
    });
  },
};

export default basePoolHistoryReplay;
