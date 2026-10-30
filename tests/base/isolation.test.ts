import type { Request, Response } from 'express';
import { afterEach, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import resolveLaunchSlug from '../../src/middleware/resolveLaunchSlug';
import parseLaunchListQuery from '../../src/utils/launch/parseLaunchListQuery';
import buildLaunchListPipeline from '../../src/utils/launch/buildLaunchListPipeline';

const address = '0x1111111111111111111111111111111111111111';

afterEach((): void => {
  vi.restoreAllMocks();
});

it('resolves identical slugs independently across both chains and network environments', async (): Promise<void> => {
  vi.spyOn(Launch, 'findOne').mockReturnValue({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ contractId: address }) }),
  } as never);

  for (const chain of ['stellar', 'base'] as const) {
    for (const network of ['testnet', 'public'] as const) {
      const req = { chain, network, params: { slug: 'blue-project' } } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await resolveLaunchSlug(req, res, next);

      expect(Launch.findOne).toHaveBeenLastCalledWith({ chain, network, slug: 'blue-project' });

      expect(req.launchIdentity).toEqual({ chain, network, contractId: address });
    }
  }
});

it('keeps listing and trade volume joins scoped to the same chain', (): void => {
  const query = parseLaunchListQuery({ owner: address, sort: 'trending' }, 'testnet', 'base');

  expect(query).not.toBeNull();

  const pipeline = buildLaunchListPipeline(query!, new Date());
  const lookup = pipeline.find((stage) => '$lookup' in stage);

  expect(pipeline[0]).toEqual({ $match: { chain: 'base', network: 'testnet', owner: address } });

  expect(lookup).toMatchObject({
    $lookup: {
      let: { launchChain: '$chain' },
      pipeline: expect.arrayContaining([
        expect.objectContaining({
          $match: {
            $expr: { $and: expect.arrayContaining([{ $eq: ['$chain', '$$launchChain'] }]) },
          },
        }),
      ]),
    },
  });

  expect(parseLaunchListQuery({ owner: address }, 'testnet', 'stellar')).toBeNull();
});
