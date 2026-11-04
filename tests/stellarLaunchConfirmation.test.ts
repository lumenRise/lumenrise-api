import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

import StellarTransactionJob from '../src/models/StellarTransactionJob';
import submitStellarTransaction from '../src/services/launch/submitStellarTransaction';
import publishStellarTransactionJob from '../src/services/launch/publishStellarTransactionJob';

vi.mock('../src/env', () => ({ default: {} }));

vi.mock('../src/logger', () => ({ default: { warn: vi.fn() } }));

vi.mock('../src/models/StellarTransactionJob', () => ({ default: { findOneAndUpdate: vi.fn() } }));

vi.mock('../src/services/launch/publishStellarTransactionJob', () => ({ default: vi.fn() }));

const hash = 'a'.repeat(64);

const request = {
  path: '/confirm',
  network: 'public',
  body: { transactionHash: hash },
  params: {},
} as unknown as Request;

const response = { status: vi.fn(), set: vi.fn(), json: vi.fn() };

beforeEach((): void => {
  vi.resetAllMocks();

  response.status.mockReturnValue(response);

  response.set.mockReturnValue(response);

  vi.mocked(StellarTransactionJob.findOneAndUpdate).mockResolvedValue({
    _id: 'job',
    status: 'queued',
    attempts: 0,
  } as never);
});

it('durably queues confirmation and returns pending instead of reporting unprocessed work as completed', async (): Promise<void> => {
  await submitStellarTransaction(request, response as unknown as Response, vi.fn());

  expect(StellarTransactionJob.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'launch', network: 'public', transactionHash: hash }),
    expect.any(Object),
    expect.objectContaining({ upsert: true }),
  );

  expect(publishStellarTransactionJob).toHaveBeenCalledWith('job', 'public');

  expect(response.status).toHaveBeenCalledWith(202);

  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
});

it('keeps accepted work pending when publishing fails so worker reconciliation can recover it', async (): Promise<void> => {
  vi.mocked(publishStellarTransactionJob).mockRejectedValue(new Error('Broker unavailable'));

  await submitStellarTransaction(request, response as unknown as Response, vi.fn());

  expect(response.status).toHaveBeenCalledWith(202);
});

it('rejects malformed transaction hashes before enqueueing', async (): Promise<void> => {
  await submitStellarTransaction(
    { ...request, body: { transactionHash: 'invalid' } } as Request,
    response as unknown as Response,
    vi.fn(),
  );

  expect(response.status).toHaveBeenCalledWith(400);

  expect(StellarTransactionJob.findOneAndUpdate).not.toHaveBeenCalled();
});
