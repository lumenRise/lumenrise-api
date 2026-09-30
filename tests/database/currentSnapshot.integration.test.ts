import { randomUUID } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import XDataSnapshot from '../../src/models/XDataSnapshot';
import ExternalAccount from '../../src/models/ExternalAccount';
import GitHubDataSnapshot from '../../src/models/GitHubDataSnapshot';
import ReputationSnapshot from '../../src/models/ReputationSnapshot';
import getCurrentReputationSnapshot from '../../src/services/reputation/currentSnapshot';
const databaseName = `lumenrise_current_score_${randomUUID().replaceAll('-', '')}`;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('current connection score', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5_000,
    });
    await Promise.all([
      ExternalAccount.createIndexes(),
      GitHubDataSnapshot.createIndexes(),
      XDataSnapshot.createIndexes(),
      ReputationSnapshot.createIndexes(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  });

  for (const [provider, category, Data] of [
    ['github', 'developer', GitHubDataSnapshot],
    ['x', 'social', XDataSnapshot],
  ] as const) {
    it(`does not expose a ${category} score from a disconnected or previous ${provider} account`, async () => {
      const identity = new Types.ObjectId();
      const oldAccount = await ExternalAccount.create({
        identity,
        provider,
        providerAccountId: `${provider}-old`,
        username: 'old',
        connectedAt: new Date(),
      });
      const oldDataId = new Types.ObjectId();
      await Data.collection.insertOne({
        _id: oldDataId,
        identity,
        externalAccount: oldAccount._id,
        providerAccountId: oldAccount.providerAccountId,
        collectedAt: new Date(),
      });
      await ReputationSnapshot.create({
        identity,
        category,
        status: 'complete',
        algorithmVersion: `${category}-v1`,
        score: 80,
        signals: [],
        sources: [{ provider, snapshot: oldDataId, dataVersion: 'v1', collectedAt: new Date() }],
        calculatedAt: new Date(),
      });

      expect((await getCurrentReputationSnapshot(identity, category))?.score).toBe(80);

      await ExternalAccount.updateOne({ _id: oldAccount._id }, {
        $set: { status: 'disconnected', disconnectedAt: new Date() },
      });
      expect(await getCurrentReputationSnapshot(identity, category)).toBeNull();

      const newAccount = await ExternalAccount.create({
        identity,
        provider,
        providerAccountId: `${provider}-new`,
        username: 'new',
        connectedAt: new Date(),
      });
      expect(await getCurrentReputationSnapshot(identity, category)).toBeNull();

      const newDataId = new Types.ObjectId();
      await Data.collection.insertOne({
        _id: newDataId,
        identity,
        externalAccount: newAccount._id,
        providerAccountId: newAccount.providerAccountId,
        collectedAt: new Date(),
      });
      const currentScore = await ReputationSnapshot.create({
        identity,
        category,
        status: 'complete',
        algorithmVersion: `${category}-v1`,
        score: 55,
        signals: [],
        sources: [{ provider, snapshot: newDataId, dataVersion: 'v1', collectedAt: new Date() }],
        calculatedAt: new Date(),
      });
      expect((await getCurrentReputationSnapshot(identity, category))?.score).toBe(55);

      await Data.collection.insertOne({
        identity,
        externalAccount: newAccount._id,
        providerAccountId: newAccount.providerAccountId,
        collectedAt: new Date(Date.now() + 1_000),
      });
      expect((await getCurrentReputationSnapshot(identity, category))?.score).toBe(55);

      await ReputationSnapshot.collection.updateOne(
        { _id: currentScore._id },
        { $set: { calculatedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1_000) } },
      );
      expect(await getCurrentReputationSnapshot(identity, category)).toBeNull();
    });
  }
});
