import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import TestnetActivity from '../../src/models/TestnetActivity';
import recordTestnetActivity from '../../src/services/launch/recordTestnetActivity';

vi.mock('../../src/services/messaging/requestDomainRead', (): object => ({
  default: vi.fn().mockResolvedValue({ status: 'accepted' }),
}));

const databaseName = `testnet_activity_${randomUUID().replaceAll('-', '')}`;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('durable testnet activity', (): void => {
  beforeAll(async (): Promise<void> => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: databaseName });

    await TestnetActivity.createIndexes();
  });

  afterAll(async (): Promise<void> => {
    await mongoose.connection.dropDatabase();

    await mongoose.disconnect();
  });

  it('keeps the latest deadline across concurrent and out-of-order requests, independently per chain', async (): Promise<void> => {
    const now = Date.now();

    await Promise.all([
      recordTestnetActivity('base', now + 10000),
      recordTestnetActivity('base', now),
      recordTestnetActivity('base', now + 5000),
      recordTestnetActivity('stellar', now + 1000),
    ]);

    expect(await TestnetActivity.countDocuments()).toBe(2);

    expect((await TestnetActivity.findById('base').lean())?.activeUntil.getTime()).toBe(
      now + 10000 + 30 * 60_000,
    );

    expect((await TestnetActivity.findById('stellar').lean())?.activeUntil.getTime()).toBe(
      now + 1000 + 30 * 60_000,
    );

    await mongoose.disconnect();

    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: databaseName });

    expect((await TestnetActivity.findById('base').lean())?.activeUntil.getTime()).toBe(
      now + 10000 + 30 * 60_000,
    );
  });
});
