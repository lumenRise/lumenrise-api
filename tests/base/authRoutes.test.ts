import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Identity from '../../src/models/Identity';
import EvmAccount from '../../src/models/EvmAccount';
import { withDatabaseTransaction } from '../../src/db';
import PrivyIdentity from '../../src/models/PrivyIdentity';
import StellarAccount from '../../src/models/StellarAccount';
import verifyPrivyUser from '../../src/services/auth/privy/verifyPrivyUser';
import findPrivyIdentity from '../../src/services/auth/privy/findPrivyIdentity';
import getPrivyAddresses from '../../src/services/auth/privy/getPrivyAddresses';
import findPrivyIdentityInSession from '../../src/services/auth/privy/findPrivyIdentityInSession';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

vi.mock('../../src/services/auth/privy/findPrivyIdentity', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/getPrivyAddresses', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/verifyPrivyUser', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/findPrivyIdentityInSession', () => ({ default: vi.fn() }));

vi.mock('../../src/env', async (original) => ({
  default: {
    ...(await original<{ default: object }>()).default,
    PRIVY_APP_ID: 'test-app',
    PRIVY_APP_SECRET: 'test-secret',
  },
}));

const identityId = new Types.ObjectId();
const userId = 'did:privy:testuser';
const address = '0x1111111111111111111111111111111111111111';

beforeEach((): void => {
  vi.clearAllMocks();

  vi.mocked(withDatabaseTransaction).mockImplementation(async (operation) =>
    operation({} as never),
  );

  vi.mocked(findPrivyIdentityInSession).mockResolvedValue(null);

  vi.mocked(getPrivyAddresses).mockResolvedValue([address]);

  vi.mocked(verifyPrivyUser).mockResolvedValue(true);

  vi.spyOn(Identity, 'create').mockResolvedValue([
    { _id: identityId, name: 'Alice', status: 'active' },
  ] as never);

  vi.spyOn(EvmAccount, 'find').mockReturnValue({ session: vi.fn().mockResolvedValue([]) } as never);

  vi.spyOn(EvmAccount, 'findOne').mockReturnValue({
    session: vi.fn().mockResolvedValue(null),
  } as never);

  vi.spyOn(EvmAccount, 'create').mockResolvedValue([] as never);

  vi.spyOn(PrivyIdentity, 'updateOne').mockResolvedValue({} as never);

  vi.spyOn(StellarAccount, 'create');
});

afterEach((): void => {
  vi.restoreAllMocks();
});

it('registers with Privy ID and address without an avatar or Stellar account', async (): Promise<void> => {
  const response = await request(app)
    .post('/v1/auth/register')
    .set('X-Chain', 'base')
    .set('X-Network', 'testnet')
    .send({ userId, name: 'Alice', address });

  expect(response.status).toBe(200);

  expect(response.body.result).toMatchObject({
    userId,
    identityId: identityId.toString(),
    addresses: [address],
  });

  expect(Identity.create).toHaveBeenCalledWith(
    [expect.objectContaining({ externalUserIds: [], name: 'Alice' })],
    expect.anything(),
  );

  expect(PrivyIdentity.updateOne).toHaveBeenCalledWith(
    { userId },
    expect.objectContaining({ $setOnInsert: { userId, identity: identityId } }),
    expect.anything(),
  );

  expect(StellarAccount.create).not.toHaveBeenCalled();
});

it('uses a local Privy mapping for subsequent x-user-id requests', async (): Promise<void> => {
  vi.mocked(findPrivyIdentity).mockResolvedValue({ _id: identityId, status: 'active' } as never);

  const response = await request(app)
    .get('/v1/auth/session')
    .set('X-Chain', 'base')
    .set('X-User-Id', userId);

  expect(response.status).toBe(200);

  expect(response.body.result).toEqual({ identityId: identityId.toString(), userId });

  expect(getPrivyAddresses).not.toHaveBeenCalled();
});

it('rejects suspended Base identities and prevents Base reputation requests', async (): Promise<void> => {
  vi.mocked(findPrivyIdentity).mockResolvedValue({ _id: identityId, status: 'suspended' } as never);

  expect(
    (await request(app).get('/v1/auth/session').set('X-Chain', 'base').set('X-User-Id', userId))
      .status,
  ).toBe(403);

  expect(
    (await request(app).get('/v1/reputation').set('X-Chain', 'base').set('X-User-Id', userId))
      .status,
  ).toBe(400);
});

it('rejects invalid chain and conflicting network headers', async (): Promise<void> => {
  expect((await request(app).get('/v1/auth/status').set('X-Chain', 'unknown')).status).toBe(400);

  expect(
    (
      await request(app)
        .get('/v1/auth/status')
        .set('X-Chain', 'base')
        .set('X-Stellar-Network', 'public')
    ).status,
  ).toBe(400);

  expect(
    (await request(app).get('/v1/auth/status').set('X-Chain', 'stellar').set('X-Network', 'public'))
      .status,
  ).toBe(400);
});

it('never stores an unverified wallet', async (): Promise<void> => {
  vi.mocked(getPrivyAddresses).mockResolvedValue(null);

  const response = await request(app)
    .post('/v1/auth/register')
    .set('X-Chain', 'base')
    .send({ userId, name: 'Alice', address });

  expect(response.status).toBe(401);

  expect(Identity.create).not.toHaveBeenCalled();

  expect(EvmAccount.create).not.toHaveBeenCalled();
});

it.each(['/v1/auth/register', '/v1/auth/resolve'])(
  'rejects unauthenticated Privy requests before wallet lookup or writes: %s',
  async (path): Promise<void> => {
    vi.mocked(verifyPrivyUser).mockResolvedValue(false);

    const response = await request(app)
      .post(path)
      .set('X-Chain', 'base')
      .set('Authorization', 'Bearer invalid-token')
      .send({ userId, name: 'Alice', address });

    expect(response.status).toBe(401);
    expect(verifyPrivyUser).toHaveBeenCalledWith('Bearer invalid-token', userId);
    expect(getPrivyAddresses).not.toHaveBeenCalled();
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
    expect(Identity.create).not.toHaveBeenCalled();
  },
);

it.each(['/v1/auth/session', '/v1/auth/status'])(
  'does not authenticate a Privy DID without a verified token: %s',
  async (path): Promise<void> => {
    vi.mocked(verifyPrivyUser).mockResolvedValue(false);

    const response = await request(app)
      .get(path)
      .set('X-Chain', 'base')
      .set('X-User-Id', userId);

    expect(response.status).toBe(401);
    expect(findPrivyIdentity).not.toHaveBeenCalled();
  },
);

it('rejects malformed Privy IDs before verifying or looking up the user', async (): Promise<void> => {
  const response = await request(app)
    .post('/v1/auth/resolve')
    .set('X-Chain', 'base')
    .send({ userId: { id: userId }, address });

  expect(response.status).toBe(400);
  expect(verifyPrivyUser).not.toHaveBeenCalled();
  expect(getPrivyAddresses).not.toHaveBeenCalled();
});

it('does not merge conflicting existing wallet identities', async (): Promise<void> => {
  vi.mocked(findPrivyIdentityInSession).mockResolvedValue({
    _id: identityId,
    status: 'active',
  } as never);

  vi.mocked(EvmAccount.find).mockReturnValue({
    session: vi.fn().mockResolvedValue([{ identity: new Types.ObjectId(), address }]),
  } as never);

  expect(
    (
      await request(app)
        .post('/v1/auth/register')
        .set('X-Chain', 'base')
        .send({ userId, name: 'Alice', address })
    ).status,
  ).toBe(409);

  expect(PrivyIdentity.updateOne).not.toHaveBeenCalled();
});

it('returns only public Privy configuration for Base', async (): Promise<void> => {
  const response = await request(app).get('/v1/config').set('X-Chain', 'base');

  expect(response.status).toBe(200);
  expect(response.body.result).toMatchObject({
    chain: 'base',
    auth: { appId: 'test-app' },
    network: {
      header: 'X-Network',
      configurations: {
        testnet: { chainId: 84532, launchConfigured: false },
        public: { chainId: 8453, launchConfigured: false },
      },
    },
  });
  expect(JSON.stringify(response.body)).not.toContain('test-secret');
});
