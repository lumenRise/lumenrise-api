import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Launch from '../../src/models/Launch';
import BaseTransactionJob from '../../src/models/BaseTransactionJob';
import verifyPrivyUser from '../../src/services/auth/privy/verifyPrivyUser';
import findPrivyIdentity from '../../src/services/auth/privy/findPrivyIdentity';
import publishBaseTransactionJob from '../../src/services/launch/publishBaseTransactionJob';

vi.mock('../../src/logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

vi.mock('../../src/models/BaseTransactionJob', () => ({ default: { findOneAndUpdate: vi.fn() } }));

vi.mock('../../src/services/auth/privy/verifyPrivyUser', () => ({ default: vi.fn() }));

vi.mock('../../src/services/auth/privy/findPrivyIdentity', () => ({ default: vi.fn() }));

vi.mock('../../src/services/launch/publishBaseTransactionJob', () => ({ default: vi.fn() }));

const route = '/v1/launches/blue-project/trades';
const hash = `0x${'a'.repeat(64)}`;
const curve = '0x1111111111111111111111111111111111111111';

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(verifyPrivyUser).mockResolvedValue(true);

  vi.mocked(findPrivyIdentity).mockResolvedValue({
    _id: new Types.ObjectId(),
    status: 'active',
  } as never);

  vi.mocked(BaseTransactionJob.findOneAndUpdate).mockResolvedValue({
    _id: 'job',
    status: 'queued',
    attempts: 0,
  } as never);

  vi.spyOn(Launch, 'findOne').mockReturnValue({
    lean: async () => ({ chain: 'base', contractId: curve }),
    select: () => ({ lean: async () => ({ contractId: curve }) }),
  } as never);
});

afterEach((): void => {
  vi.restoreAllMocks();
});

it('authenticates and queues a known launch trade without performing domain processing in the API', async (): Promise<void> => {
  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .set('X-User-Id', 'did:privy:testuser')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);

  expect(BaseTransactionJob.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'trade', contractId: curve }),
    expect.any(Object),
    expect.any(Object),
  );

  expect(publishBaseTransactionJob).toHaveBeenCalledWith('job', 'testnet');
});

it('returns the completed worker result without queueing or verifying it again', async (): Promise<void> => {
  vi.mocked(BaseTransactionJob.findOneAndUpdate).mockResolvedValue({
    status: 'completed',
    result: { trade: { side: 'buy' } },
  } as never);

  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .set('X-User-Id', 'did:privy:testuser')
    .send({ transactionHash: hash });

  expect(response.status).toBe(200);

  expect(response.body.result.trade.side).toBe('buy');

  expect(publishBaseTransactionJob).not.toHaveBeenCalled();
});

it('rejects anonymous submissions before creating work', async (): Promise<void> => {
  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(401);

  expect(BaseTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});

it('rejects malformed hashes before creating work', async (): Promise<void> => {
  const response = await request(app)
    .post(route)
    .set('X-Chain', 'base')
    .set('X-User-Id', 'did:privy:testuser')
    .send({ transactionHash: 'invalid' });

  expect(response.status).toBe(400);

  expect(BaseTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});
