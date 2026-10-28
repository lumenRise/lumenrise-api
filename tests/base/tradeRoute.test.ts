import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Launch from '../../src/models/Launch';
import createBaseLog from '../helpers/createBaseLog';
import getBaseContext from '../../src/services/base/getBaseContext';
import type { BaseWriteContext } from '../../src/types/base/launch';
import acquireBaseLease from '../../src/services/base/acquireBaseLease';
import releaseBaseLease from '../../src/services/base/releaseBaseLease';
import processBaseBlock from '../../src/services/base/processBaseBlock';
import verifyPrivyUser from '../../src/services/auth/privy/verifyPrivyUser';
import findPrivyIdentity from '../../src/services/auth/privy/findPrivyIdentity';

vi.mock('../../src/services/base/getBaseContext', () => ({ default: vi.fn() }));

vi.mock('../../src/services/base/acquireBaseLease', () => ({ default: vi.fn() }));

vi.mock('../../src/services/base/releaseBaseLease', () => ({ default: vi.fn() }));

vi.mock('../../src/services/base/processBaseBlock', () => ({ default: vi.fn() }));

vi.mock('../../src/services/base/reconcileBaseChain', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/findPrivyIdentity', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/verifyPrivyUser', () => ({ default: vi.fn() }));

const event = createBaseLog();
const route = '/v1/launches/blue-project/trades';

const context = {
  leaseOwner: 'receipt-worker',
  configuration: { network: 'testnet', factoryAddress: 'factory' },
  client: { getTransactionReceipt: vi.fn(), getBlock: vi.fn() },
} as unknown as BaseWriteContext;

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(verifyPrivyUser).mockResolvedValue(true);

  vi.mocked(findPrivyIdentity).mockResolvedValue({
    _id: new Types.ObjectId(),
    status: 'active',
  } as never);

  vi.mocked(getBaseContext).mockResolvedValue(context);

  vi.mocked(acquireBaseLease).mockResolvedValue(context);

  vi.mocked(context.client.getTransactionReceipt).mockResolvedValue({
    status: 'success',
    transactionHash: event.transactionHash,
    blockNumber: 20n,
    blockHash: event.blockHash,
    logs: [event],
  } as never);

  vi.mocked(context.client.getBlock).mockResolvedValue({
    number: 20n,
    hash: event.blockHash,
    timestamp: 100n,
  } as never);

  vi.spyOn(Launch, 'exists').mockResolvedValue({ _id: 'launch' } as never);
  vi.spyOn(Launch, 'findOne').mockReturnValue({
    lean: vi.fn().mockResolvedValue({ contractId: event.address, asset: 'asset', pair: 'pair' }),
    select: vi
      .fn()
      .mockReturnValue({ lean: vi.fn().mockResolvedValue({ contractId: event.address }) }),
  } as never);
});

afterEach((): void => {
  vi.restoreAllMocks();
});

it('verifies the receipt quickly and records every trade through shared ingestion', async (): Promise<void> => {
  vi.mocked(context.client.getTransactionReceipt).mockResolvedValue({
    status: 'success',
    transactionHash: event.transactionHash,
    blockNumber: 20n,
    blockHash: event.blockHash,
    logs: [event, createBaseLog(3)],
  } as never);

  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .set('X-User-Id', 'did:privy:testuser')
    .send({ transactionHash: event.transactionHash });

  expect(response.status).toBe(200);

  expect(response.body.result.trades).toHaveLength(2);

  expect(processBaseBlock).toHaveBeenCalledWith(
    expect.objectContaining({ context, number: 20n, logs: [event, createBaseLog(3)] }),
  );

  expect(releaseBaseLease).toHaveBeenCalledWith(context);
});

it('returns pending for an unavailable receipt without registering a trade', async (): Promise<void> => {
  vi.mocked(context.client.getTransactionReceipt).mockRejectedValue(
    Object.assign(new Error('Not found'), { name: 'TransactionReceiptNotFoundError' }),
  );

  expect(
    (
      await request(app)
        .post(route)
        .set('X-Chain', 'base')
        .set('X-User-Id', 'did:privy:testuser')
        .send({ transactionHash: event.transactionHash })
    ).status,
  ).toBe(202);

  expect(processBaseBlock).not.toHaveBeenCalled();
});

it('rejects a reverted transaction and ignores unrelated emitters', async (): Promise<void> => {
  vi.mocked(context.client.getTransactionReceipt)
    .mockResolvedValueOnce({ status: 'reverted' } as never)
    .mockResolvedValue({
      status: 'success',
      transactionHash: event.transactionHash,
      blockNumber: 20n,
      blockHash: event.blockHash,
      logs: [{ ...event, address: '0x9999999999999999999999999999999999999999' }],
    } as never);

  expect(
    (
      await request(app)
        .post(route)
        .set('X-Chain', 'base')
        .set('X-User-Id', 'did:privy:testuser')
        .send({ transactionHash: event.transactionHash })
    ).status,
  ).toBe(400);

  expect(
    (
      await request(app)
        .post(route)
        .set('X-Chain', 'base')
        .set('X-User-Id', 'did:privy:testuser')
        .send({ transactionHash: event.transactionHash })
    ).status,
  ).toBe(400);

  expect(processBaseBlock).not.toHaveBeenCalled();
});

it('defers a launch removed during reorg recovery instead of claiming a trade was saved', async (): Promise<void> => {
  vi.mocked(Launch.exists).mockResolvedValue(null);

  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .set('X-User-Id', 'did:privy:testuser')
    .send({ transactionHash: event.transactionHash });

  expect(response.status).toBe(202);
  expect(processBaseBlock).not.toHaveBeenCalled();
  expect(releaseBaseLease).toHaveBeenCalledWith(context);
});
