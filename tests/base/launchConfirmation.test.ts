import express from 'express';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import resolveChain from '../../src/middleware/resolveChain';
import resolveNetwork from '../../src/middleware/resolveNetwork';
import BaseTransactionJob from '../../src/models/BaseTransactionJob';
import postConfirmation from '../../src/routes/launches/postConfirmation';
import publishBaseTransactionJob from '../../src/services/launch/publishBaseTransactionJob';

vi.mock('../../src/env', () => ({ default: {} }));

vi.mock('../../src/logger', () => ({ default: { warn: vi.fn() } }));

vi.mock('../../src/models/Launch', () => ({ default: { find: vi.fn() } }));

vi.mock('../../src/models/BaseTransactionJob', () => ({ default: { findOneAndUpdate: vi.fn() } }));

vi.mock('../../src/utils/launch/toLaunchResult', () => ({ default: (launch: unknown) => launch }));

vi.mock('../../src/services/launch/publishBaseTransactionJob', () => ({ default: vi.fn() }));

vi.mock('../../src/routes/launches/postStellarConfirmation', () => ({ default: vi.fn() }));

const app = express();
const hash = `0x${'a'.repeat(64)}`;

app.use(express.json());

app.use(resolveChain);

app.use(resolveNetwork);

app.post('/confirm', postConfirmation);

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(BaseTransactionJob.findOneAndUpdate).mockResolvedValue({
    _id: 'job',
    status: 'queued',
    attempts: 0,
  } as never);
});

it('queues confirmation promptly and reports pending until the launch worker finishes', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);

  expect(response.headers['retry-after']).toBe('2');

  expect(publishBaseTransactionJob).toHaveBeenCalledWith('job', 'testnet');
});

it('returns persisted launch results after worker completion', async (): Promise<void> => {
  vi.mocked(BaseTransactionJob.findOneAndUpdate).mockResolvedValue({
    status: 'completed',
    result: { launchContracts: ['curve'] },
  } as never);

  vi.mocked(Launch.find).mockReturnValue({
    lean: async () => [{ contractId: 'curve', slug: 'blue-project' }],
  } as never);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(200);

  expect(response.body.result.launches[0].slug).toBe('blue-project');

  expect(publishBaseTransactionJob).not.toHaveBeenCalled();
});

it('retains durable submission when the broker is unavailable', async (): Promise<void> => {
  vi.mocked(publishBaseTransactionJob).mockRejectedValue(new Error('Broker unavailable'));

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);
});

it('rejects malformed hashes before job submission', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: 'invalid' });

  expect(response.status).toBe(400);

  expect(BaseTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});

it('rejects conflicting networks before job submission', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash, network: 'public' });

  expect(response.status).toBe(400);

  expect(BaseTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});

it('returns the worker rejection without publishing duplicate work', async (): Promise<void> => {
  vi.mocked(BaseTransactionJob.findOneAndUpdate).mockResolvedValue({
    status: 'failed',
    lastError: 'Transaction failed',
  } as never);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(400);

  expect(publishBaseTransactionJob).not.toHaveBeenCalled();
});

it('keeps trailing-slash confirmation URLs on the launch queue path', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm/')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);

  expect(BaseTransactionJob.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'launch' }),
    expect.any(Object),
    expect.any(Object),
  );
});
