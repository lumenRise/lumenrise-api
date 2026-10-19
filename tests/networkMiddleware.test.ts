import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import resolveNetwork from '../src/middleware/resolveNetwork';

describe('request network selection', () => {
  it.each([
    [undefined, undefined, 'testnet'],
    ['testnet', undefined, 'testnet'],
    ['public', undefined, 'public'],
    [undefined, 'public', 'public'],
    ['public', 'public', 'public'],
  ])('resolves header %s and legacy query %s to %s', (header, legacy, expected) => {
    const req = {
      get: vi.fn().mockReturnValue(header),
      query: { network: legacy },
    } as unknown as Request;
    const res = { set: vi.fn(), vary: vi.fn() } as unknown as Response;
    const next = vi.fn();

    resolveNetwork(req, res, next as NextFunction);

    expect(req.network).toBe(expected);
    expect(res.set).toHaveBeenCalledWith('X-Stellar-Network', expected);
    expect(res.vary).toHaveBeenCalledWith('X-Stellar-Network');
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([
    ['mainnet', undefined],
    ['', undefined],
    ['PUBLIC', undefined],
    ['testnet, public', undefined],
    [undefined, ['testnet', 'public']],
    [undefined, 'invalid'],
    ['public', 'testnet'],
    ['testnet', 'public'],
  ])('rejects invalid or conflicting selectors %s and %s', (header, legacy) => {
    const req = {
      get: vi.fn().mockReturnValue(header),
      query: { network: legacy },
    } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    resolveNetwork(req, res, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
