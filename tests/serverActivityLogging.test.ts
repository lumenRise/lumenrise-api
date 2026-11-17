import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

import log from '../src/logger';
import logServerActivity from '../src/middleware/logServerActivity';

vi.mock('../src/logger', () => ({ default: { info: vi.fn() } }));

beforeEach((): void => {
  vi.clearAllMocks();
});

it.each([
  ['DELETE', '/v1/launches/example/team/member', 200, 'Launch team member removed'],
  ['POST', '/v1/connections/github/sync', 202, 'GitHub account synchronization requested'],
])(
  'describes the successful %s %s operation clearly',
  (method, path, statusCode, message): void => {
    const request = {
      method,
      path,
      chain: 'base',
      network: 'testnet',
      body: { accessToken: 'private-token' },
      query: { code: 'private-code' },
      headers: { authorization: 'Bearer private-token' },
    } as unknown as Request;

    const response = Object.assign(new EventEmitter(), { statusCode, locals: {} });
    const next = vi.fn();

    logServerActivity(request, response as unknown as Response, next);

    expect(log.info).not.toHaveBeenCalled();

    response.emit('finish');

    expect(next).toHaveBeenCalledOnce();

    expect(log.info).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ chain: 'base', network: 'testnet', method, path, statusCode }),
      message,
    );

    expect(JSON.stringify(vi.mocked(log.info).mock.calls)).not.toContain('private-');
  },
);

it.each([
  ['GET', '/v1/launches/example/market', 200],
  ['GET', '/v1/auth/status', 200],
  ['GET', '/v1/auth/session', 200],
  ['POST', '/v1/auth/resolve', 200],
  ['POST', '/v1/auth/register', 200],
  ['POST', '/v1/launches/example/trades', 200],
  ['POST', '/v1/launches/confirm', 202],
  ['POST', '/v1/auth/register', 400],
  ['DELETE', '/v1/launches/example/team/member', 500],
])(
  'does not log polling, confirmation replays or failures as successful activity: %s %s %s',
  (method, path, statusCode): void => {
    const request = { method, path } as Request;
    const response = Object.assign(new EventEmitter(), { statusCode, locals: {} });

    logServerActivity(request, response as unknown as Response, vi.fn());

    response.emit('finish');

    expect(log.info).not.toHaveBeenCalled();
  },
);

it.each([
  ['/v1/auth/register', 'User registration completed', { addresses: ['wallet-address'] }],
  ['/v1/auth/resolve', 'User login resolved', { address: 'wallet-address' }],
])('logs verified account details once for %s', (path, message, wallets): void => {
  const accountActivity = { name: 'Taylor', ...wallets };
  const request = { method: 'POST', path } as Request;

  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    locals: { accountActivity },
  });

  logServerActivity(request, response as unknown as Response, vi.fn());

  response.emit('finish');
  response.emit('finish');

  expect(log.info).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining(accountActivity),
    message,
  );
});
