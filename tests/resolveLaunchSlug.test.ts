import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import resolveLaunchSlug from '../src/middleware/resolveLaunchSlug';
import parseMarketRequest from '../src/utils/launch/parseMarketRequest';

vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));

describe('public slug to internal contract resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each(['testnet', 'public'])('resolves within %s and keeps database identities contract based', async (network) => {
    const req = { network, params: { slug: 'blue-man' } } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    vi.mocked(Launch.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ contractId: 'internal-contract' }) }),
    } as never);

    await resolveLaunchSlug(req, res, next);

    expect(Launch.findOne).toHaveBeenCalledWith({ network, slug: 'blue-man' });
    expect(parseMarketRequest(req)).toEqual({ network, contractId: 'internal-contract' });
    expect(req.launchSlug).toBe('blue-man');
    expect(next).toHaveBeenCalledOnce();
  });

  it.each(['Blue-Man', 'blue man', '-blue', 'blue-', 'a'.repeat(101)])('rejects noncanonical paths: %s', async (slug) => {
    const req = { network: 'testnet', params: { slug } } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    await resolveLaunchSlug(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Launch.findOne).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown name', async () => {
    const req = { network: 'testnet', params: { slug: 'missing' } } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    vi.mocked(Launch.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    } as never);

    await resolveLaunchSlug(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
