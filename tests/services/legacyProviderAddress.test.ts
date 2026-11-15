import { Types } from 'mongoose';
import { it, vi, expect } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';

import Identity from '../../src/models/Identity';
import StellarAccount from '../../src/models/StellarAccount';
import verifyProviderAddress from '../../src/services/auth/verifyProviderAddress';

it.each(['linked', 'unknown', 'otherWallet', 'conflict', 'unverified', 'wrongNetwork', 'wrongPin'])(
  'handles a retired numeric ID for a %s account without changing stored identities',
  async (scenario: string): Promise<void> => {
    const identityId = new Types.ObjectId();
    const otherId = new Types.ObjectId();
    const address = Keypair.random().publicKey();
    const publicUserId = 'iq7drfc4as8420akxk2d';

    const verified = {
      exists: scenario !== 'unverified',
      user_id: publicUserId,
      network: scenario === 'wrongNetwork' ? 'ethereum' : 'stellar',
    };

    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid user ID' }), { status: 400 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: verified }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              exists: true,
              network: 'stellar',
              user_id: scenario === 'wrongPin' ? 'anotherpublicuserid01' : publicUserId,
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetch);

    vi.spyOn(Identity, 'findOne')
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(scenario === 'unknown' ? null : { _id: identityId }),
      } as never)
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(scenario === 'conflict' ? { _id: otherId } : null),
      } as never);

    vi.spyOn(StellarAccount, 'findOne').mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue({ identity: scenario === 'otherWallet' ? otherId : identityId }),
    } as never);

    const write = vi.spyOn(Identity, 'updateOne');

    try {
      expect(await verifyProviderAddress('787', address)).toBe(scenario === 'linked');
      expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toEqual({ address, user_id: '787' });
      expect(write).not.toHaveBeenCalled();

      if (scenario === 'unknown' || scenario === 'otherWallet') {
        expect(fetch).toHaveBeenCalledTimes(1);

        return;
      }

      expect(JSON.parse(fetch.mock.calls[1]?.[1].body)).toEqual({ address });

      if (scenario === 'linked' || scenario === 'wrongPin') {
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(JSON.parse(fetch.mock.calls[2]?.[1].body)).toEqual({
          address,
          user_id: publicUserId,
        });
      } else {
        expect(fetch).toHaveBeenCalledTimes(2);
      }
    } finally {
      vi.restoreAllMocks();

      vi.unstubAllGlobals();
    }
  },
);
