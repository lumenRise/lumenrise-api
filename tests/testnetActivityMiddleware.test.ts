import { EventEmitter } from 'node:events';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import trackTestnetActivity from '../src/middleware/trackTestnetActivity';
import recordTestnetActivity from '../src/services/launch/recordTestnetActivity';

vi.mock('../src/logger', (): object => ({ default: { warn: vi.fn() } }));

vi.mock('../src/services/launch/recordTestnetActivity', (): object => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

beforeEach((): void => {
  vi.clearAllMocks();
});

it.each([
  '/v1/launches',
  '/v1/user',
  '/v1/stats',
  '/v1/stellar/accounts',
  '/V1/Launches',
])('records successful testnet use centrally for %s', (path: string): void => {
  const req = { path, chain: 'base', network: 'testnet', method: 'GET' } as Request;
  const res = Object.assign(new EventEmitter(), { statusCode: 200 });
  const next = vi.fn();

  trackTestnetActivity(req, res as unknown as Response, next as NextFunction);

  expect(next).toHaveBeenCalledOnce();

  expect(recordTestnetActivity).not.toHaveBeenCalled();

  res.emit('finish');

  expect(recordTestnetActivity).toHaveBeenCalledExactlyOnceWith('base', expect.any(Number));
});

it.each([
  ['/v1/launches', 'public', 'GET', 200],
  ['/v1/launches', 'testnet', 'OPTIONS', 204],
  ['/v1/config', 'testnet', 'GET', 200],
  ['/v1/config/', 'testnet', 'GET', 200],
  ['/V1/Config', 'testnet', 'GET', 304],
  ['/v1/health', 'testnet', 'GET', 200],
  ['/v1/health/', 'testnet', 'GET', 200],
  ['/v1/docs', 'testnet', 'GET', 200],
  ['/v1/docs/swagger-ui.js', 'testnet', 'GET', 200],
  ['/v1/openapi.json', 'testnet', 'GET', 200],
  ['/other', 'testnet', 'GET', 200],
  ['/v1/launches', 'testnet', 'POST', 400],
  ['/v1/launches', 'testnet', 'POST', 401],
  ['/v1/launches', 'testnet', 'POST', 403],
  ['/v1/missing', 'testnet', 'GET', 404],
  ['/v1/launches', 'testnet', 'GET', 503],
])(
  'ignores %s on %s with %s status %s',
  (path: string, network: string, method: string, statusCode: number): void => {
    const req = { path, network, method, chain: 'stellar' } as Request;
    const res = Object.assign(new EventEmitter(), { statusCode });
    const next = vi.fn();

    trackTestnetActivity(req, res as unknown as Response, next as NextFunction);

    res.emit('finish');

    expect(next).toHaveBeenCalledOnce();

    expect(recordTestnetActivity).not.toHaveBeenCalled();
  },
);

it.each([202, 304])(
  'extends Stellar activity for accepted or cached responses: %s',
  (statusCode: number): void => {
    const req = {
      path: '/v1/launches',
      chain: 'stellar',
      network: 'testnet',
      method: 'GET',
    } as Request;

    const res = Object.assign(new EventEmitter(), { statusCode });

    trackTestnetActivity(req, res as unknown as Response, vi.fn());

    res.emit('finish');

    expect(recordTestnetActivity).toHaveBeenCalledExactlyOnceWith('stellar', expect.any(Number));
  },
);

it('keeps the completed HTTP response independent of an activity notification failure', async (): Promise<void> => {
  vi.mocked(recordTestnetActivity).mockRejectedValueOnce(new Error('Broker unavailable'));

  const req = {
    path: '/v1/launches',
    chain: 'stellar',
    network: 'testnet',
    method: 'GET',
  } as Request;

  const res = Object.assign(new EventEmitter(), { statusCode: 200 });

  trackTestnetActivity(req, res as unknown as Response, vi.fn());

  res.emit('finish');

  await Promise.resolve();

  expect(res.statusCode).toBe(200);
});
