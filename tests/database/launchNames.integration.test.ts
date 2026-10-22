import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import LaunchName from '../../src/models/LaunchName';
import toLaunchSlug from '../../src/utils/launch/toLaunchSlug';

const databaseName = `lumenrise_launch_names_${randomUUID().replaceAll('-', '')}`;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('unique project name claims', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5000,
    });

    await LaunchName.createIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('allows exactly one concurrent reservation for equivalent names', async () => {
    const results = await Promise.allSettled(['Blue Man', 'blue-man'].map((name: string, index: number) =>
      LaunchName.findOneAndUpdate(
        { network: 'testnet', slug: toLaunchSlug(name), status: 'expired' },
        {
          $set: {
            ownerAddress: `owner-${index}`,
            publicUrl: `https://images.example/${index}.png`,
            status: 'reserved',
            contractId: null,
          },
        },
        { upsert: true },
      ),
    ));

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await LaunchName.countDocuments({ network: 'testnet', slug: 'blue-man' })).toBe(1);
  });

  it('allows the same project name in a different network', async () => {
    await LaunchName.create({
      network: 'testnet',
      slug: 'shared-project',
      ownerAddress: 'first-owner',
      publicUrl: 'https://images.example/testnet.png',
      status: 'reserved',
    });

    await LaunchName.create({
      network: 'public',
      slug: 'shared-project',
      ownerAddress: 'other-owner',
      publicUrl: 'https://images.example/public.png',
      status: 'reserved',
    });

    expect(await LaunchName.countDocuments({ slug: 'shared-project' })).toBe(2);
  });

  it('prevents a stale worker from reclaiming an expired reservation', async () => {
    await LaunchName.create({
      network: 'testnet',
      slug: 'expired-project',
      ownerAddress: 'original-owner',
      publicUrl: 'https://images.example/expired.png',
      status: 'expired',
    });

    await expect(LaunchName.findOneAndUpdate(
      { network: 'testnet', slug: 'expired-project', status: 'reserved' },
      { $set: { status: 'indexed', contractId: 'late-contract' } },
      { upsert: true },
    )).rejects.toMatchObject({ code: 11000 });
  });
});
