import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Identity from '../../src/models/Identity';
import StellarAccount from '../../src/models/StellarAccount';
import identityUserIds from '../../src/migrations/20261023IdentityUserIds';

vi.mock('../../src/services/auth/verifyProviderAddress', () => ({
  default: vi.fn(async () => true),
}));

const databaseName = `identity_resolution_${randomUUID().replaceAll('-', '')}`;
const address = Keypair.random().publicKey();

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('MongoDB identity resolution', () => {
  beforeAll(async () => {
    mongoose.set('autoIndex', false);

    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: databaseName });
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('migrates legacy identities, preserves aliases, and can run again safely', async () => {
    const legacyId = new mongoose.Types.ObjectId();
    const linkedId = new mongoose.Types.ObjectId();

    await Identity.collection.insertMany([
      { _id: legacyId, externalUserId: '42', name: 'Alice', status: 'active' },
      { _id: linkedId, externalUserId: '87', externalUserIds: ['91'], status: 'active' },
      { externalUserId: null, status: 'active' },
      { status: 'active' },
    ] as never);

    await Identity.collection.createIndex(
      { externalUserId: 1 },
      {
        unique: true,
        partialFilterExpression: { externalUserId: { $type: 'string' } },
        name: 'identities_external_user_unique',
      },
    );

    await identityUserIds.up();
    await identityUserIds.up();

    expect((await Identity.findById(legacyId))?.externalUserIds).toEqual(['42']);
    expect((await Identity.findById(linkedId))?.externalUserIds).toEqual(
      expect.arrayContaining(['87', '91']),
    );
    expect(await Identity.collection.countDocuments({ externalUserId: { $exists: true } })).toBe(0);
    expect(
      (await Identity.collection.indexes()).some(
        (index) => index.name === 'identities_external_user_unique',
      ),
    ).toBe(false);
    await expect(Identity.create({ externalUserIds: ['100', '42'] })).rejects.toMatchObject({
      code: 11000,
    });
    await expect(Identity.create({ externalUserIds: [] })).resolves.toBeDefined();
    await expect(Identity.create({ externalUserIds: [] })).resolves.toBeDefined();
  });

  it('keeps both login methods on one identity and uses either ID for subsequent requests', async () => {
    await Identity.createIndexes();
    await StellarAccount.createIndexes();

    const identity = await Identity.create({ externalUserIds: ['42'], name: 'Alice' });

    await StellarAccount.create({
      identity: identity._id,
      address,
      isPrimary: true,
      connectedAt: new Date(),
    });

    const response = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });
    const retry = await request(app).post('/v1/auth/resolve').send({ userId: '87', address });

    expect(response.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(response.body.result.identityId).toBe(identity.id);
    expect((await Identity.findById(identity._id))?.externalUserIds).toEqual(['42', '87']);
    expect(await Identity.countDocuments()).toBe(1);
    expect(await StellarAccount.countDocuments()).toBe(1);

    for (const userId of ['42', '87']) {
      const session = await request(app).get('/v1/auth/session').set('x-user-id', userId);

      expect(session.status).toBe(200);
      expect(session.body.result.identityId).toBe(identity.id);
    }
  });

  it('retains different aliases when alternate logins arrive concurrently', async () => {
    await Identity.createIndexes();
    await StellarAccount.createIndexes();

    const identity = await Identity.create({ externalUserIds: ['42'], name: 'Alice' });

    await StellarAccount.create({ identity: identity._id, address, connectedAt: new Date() });

    const responses = await Promise.all([
      request(app).post('/v1/auth/resolve').send({ userId: '87', address }),
      request(app).post('/v1/auth/resolve').send({ userId: '91', address }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect((await Identity.findById(identity._id))?.externalUserIds).toEqual(
      expect.arrayContaining(['42', '87', '91']),
    );
  });
});
