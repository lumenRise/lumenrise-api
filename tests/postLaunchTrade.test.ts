import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import response from './helpers/createMarketResponse';
import postTrade from '../src/routes/launches/postTrade';
import StellarTransactionJob from '../src/models/StellarTransactionJob';
import publishStellarTransactionJob from '../src/services/launch/publishStellarTransactionJob';

vi.mock('../src/env', () => ({
  default: { STELLAR_AUTH_NETWORK: 'testnet', NODE_ENV: 'test', LOG_LEVEL: 'silent' },
}));

vi.mock('../src/logger', () => ({ default: { warn: vi.fn() } }));

vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));

vi.mock('../src/models/StellarTransactionJob', () => ({ default: { findOneAndUpdate: vi.fn() } }));

vi.mock('../src/services/launch/publishStellarTransactionJob', () => ({ default: vi.fn() }));

const hash = 'a'.repeat(64);

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(Launch.findOne).mockReturnValue({ lean: async () => ({ asset: 'token' }) } as never);

  vi.mocked(StellarTransactionJob.findOneAndUpdate).mockResolvedValue({
    _id: 'job',
    status: 'queued',
    attempts: 0,
  } as never);
});

it('queues validated trades without API-side transaction verification', async (): Promise<void> => {
  const req = { ...request(), path: '/project/trades', body: { transactionHash: hash } } as Request;
  const res = response();

  await postTrade(req, res as unknown as Response, vi.fn());

  expect(res.status).toHaveBeenCalledWith(202);

  expect(StellarTransactionJob.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'trade', transactionHash: hash, network: 'testnet' }),
    expect.anything(),
    expect.objectContaining({ upsert: true }),
  );

  expect(publishStellarTransactionJob).toHaveBeenCalledWith('job', 'testnet');
});

it('returns completed worker results without publishing another job', async (): Promise<void> => {
  vi.mocked(StellarTransactionJob.findOneAndUpdate).mockResolvedValue({
    status: 'completed',
    result: { trade: { side: 'buy' } },
  } as never);

  const res = response();

  await postTrade(
    { ...request(), path: '/project/trades', body: { transactionHash: hash } } as Request,
    res as unknown as Response,
    vi.fn(),
  );

  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'success', result: { trade: { side: 'buy' } } }),
  );

  expect(publishStellarTransactionJob).not.toHaveBeenCalled();
});

it('rejects malformed hashes and unknown launches before queueing', async (): Promise<void> => {
  const invalid = response();

  await postTrade(
    { ...request(), path: '/trades', body: { transactionHash: 'invalid' } } as Request,
    invalid as unknown as Response,
    vi.fn(),
  );

  expect(invalid.status).toHaveBeenCalledWith(400);

  vi.mocked(Launch.findOne).mockReturnValue({ lean: async () => null } as never);

  const missing = response();

  await postTrade(
    { ...request(), path: '/trades', body: { transactionHash: hash } } as Request,
    missing as unknown as Response,
    vi.fn(),
  );

  expect(missing.status).toHaveBeenCalledWith(404);

  expect(StellarTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});
