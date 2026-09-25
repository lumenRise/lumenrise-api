import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import Session from '../../src/models/Session.js';
import Identity from '../../src/models/Identity.js';
import StellarAccount from '../../src/models/StellarAccount.js';
import DeveloperApiKey from '../../src/models/DeveloperApiKey.js';
import DeveloperApiUsage from '../../src/models/DeveloperApiUsage.js';
import createApiKey from '../../src/services/developer/createApiKey.js';
import WalletAuthChallenge from '../../src/models/WalletAuthChallenge.js';
import reserveApiUsage from '../../src/services/developer/reserveApiUsage.js';
import { hashWalletMessage } from '../../src/utils/services/auth/walletChallenge/hashWalletMessage.js';

const databaseName = `lumenrise_developer_test_${randomUUID().replaceAll('-', '')}`;
const wallet = Keypair.random();
let bearer: string;
let identityId: string;
let apiKey: string;
let keyId: string;
let otherApiKey: string;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))('developer API access', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 5_000,
    });
    await Promise.all([
      Session.createIndexes(),
      Identity.createIndexes(),
      StellarAccount.createIndexes(),
      DeveloperApiKey.createIndexes(),
      DeveloperApiUsage.createIndexes(),
      WalletAuthChallenge.createIndexes(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  it('requires a wallet session to create a key and never returns its secret in listings', async () => {
    expect((await request(app).post('/v1/developers/keys').send({ label: 'My app' })).status).toBe(
      401,
    );
    const challenge = await request(app).post('/v1/auth/wallet/challenge').send({
      address: wallet.publicKey(),
      purpose: 'register',
      name: 'Developer Test',
    });
    const signature = Buffer.from(
      wallet.sign(hashWalletMessage(challenge.body.result.message)),
    ).toString('base64');
    const registered = await request(app).post('/v1/auth/wallet/register').send({
      address: wallet.publicKey(),
      name: 'Developer Test',
      challengeId: challenge.body.result.challengeId,
      signature,
    });

    expect(registered.status).toBe(201);
    bearer = registered.body.result.accessToken;
    identityId = registered.body.result.identityId;

    const created = await request(app)
      .post('/v1/developers/keys')
      .auth(bearer, { type: 'bearer' })
      .send({ label: 'My app' });

    expect(created.status).toBe(201);
    expect(created.headers['cache-control']).toBe('no-store');
    apiKey = created.body.result.apiKey;
    keyId = created.body.result.id;
    expect(apiKey).toMatch(/^lrk_[A-Za-z0-9_-]{43}$/);

    const stored = await DeveloperApiKey.findById(keyId).select('+tokenHash');

    expect(stored?.tokenHash).not.toBe(apiKey);

    const listed = await request(app).get('/v1/developers/keys').auth(bearer, { type: 'bearer' });

    expect(listed.status).toBe(200);
    expect(listed.body.result.keys[0]).not.toHaveProperty('apiKey');
    expect(listed.body.result.keys[0]).not.toHaveProperty('tokenHash');
  });

  it('only reads the identity owning the key and rejects bearer-only access', async () => {
    expect(
      (await request(app).get('/v1/developers/profile').auth(bearer, { type: 'bearer' })).status,
    ).toBe(401);

    const mine = await request(app).get('/v1/developers/profile').set('X-API-Key', apiKey);

    expect(mine.status).toBe(200);
    expect(mine.body.result.identity.id).toBe(identityId);

    const other = await Identity.create({ name: 'Other developer' });
    const otherKey = await createApiKey(other._id, 'Other app');
    otherApiKey = otherKey!.apiKey;
    const theirs = await request(app).get('/v1/developers/profile').set('X-API-Key', otherApiKey);

    expect(theirs.status).toBe(200);
    expect(theirs.body.result.identity.id).toBe(other._id.toString());
    expect(theirs.body.result.identity.id).not.toBe(identityId);
  });

  it('enforces a shared identity quota atomically under concurrent requests', async () => {
    const identity = new mongoose.Types.ObjectId();
    const now = new Date('2026-09-25T12:00:00Z');
    const results = await Promise.all(
      Array.from({ length: 61 }, () => reserveApiUsage(identity, now)),
    );

    expect(results.filter(Boolean)).toHaveLength(60);
    expect(results.filter((allowed) => !allowed)).toHaveLength(1);
    expect(await DeveloperApiUsage.countDocuments({ identity })).toBe(1);
  });

  it('rejects expired keys and inactive owners', async () => {
    const expired = await createApiKey(new mongoose.Types.ObjectId(identityId), 'Expires now');

    await DeveloperApiKey.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(expired!.id) },
      { $set: { expiresAt: new Date(Date.now() - 1_000) } },
    );
    expect(
      (await request(app).get('/v1/developers/profile').set('X-API-Key', expired!.apiKey)).status,
    ).toBe(401);

    const other = await Identity.findOne({ name: 'Other developer' });

    await Identity.updateOne({ _id: other!._id }, { $set: { status: 'suspended' } });
    expect(
      (await request(app).get('/v1/developers/profile').set('X-API-Key', otherApiKey)).status,
    ).toBe(401);
  });

  it('revokes only an owned key and rejects it immediately', async () => {
    const other = await Identity.findOne({ name: 'Other developer' });
    const otherKey = await DeveloperApiKey.findOne({ identity: other!._id });
    const forbidden = await request(app)
      .delete(`/v1/developers/keys/${otherKey!._id.toString()}`)
      .auth(bearer, { type: 'bearer' });

    expect(forbidden.status).toBe(404);

    const revoked = await request(app)
      .delete(`/v1/developers/keys/${keyId}`)
      .auth(bearer, { type: 'bearer' });

    expect(revoked.status).toBe(200);
    expect((await request(app).get('/v1/developers/profile').set('X-API-Key', apiKey)).status).toBe(
      401,
    );
  });
});
