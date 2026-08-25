import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import StellarAccount from '../../src/models/StellarAccount.js';

const STELLAR_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('StellarAccount model', () => {
  it('normalizes a connected Stellar address and applies defaults', async () => {
    const connectedAt = new Date('2026-09-22T12:00:00.000Z');
    const account = new StellarAccount({
      identity: new Types.ObjectId(),
      address: STELLAR_ADDRESS.toLowerCase(),
      connectedAt,
    });

    await account.validate();

    expect(account.address).toBe(STELLAR_ADDRESS);
    expect(account.isPrimary).toBe(false);
    expect(account.disconnectedAt).toBeNull();
  });

  it('rejects an address with an invalid Stellar checksum', async () => {
    const account = new StellarAccount({
      identity: new Types.ObjectId(),
      address: `${STELLAR_ADDRESS.slice(0, -1)}A`,
      connectedAt: new Date(),
    });

    await expect(account.validate()).rejects.toMatchObject({
      errors: {
        address: expect.anything(),
      },
    });
  });

  it('declares wallet ownership and primary-account indexes', () => {
    expect(StellarAccount.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { address: 1 },
          expect.objectContaining({
            unique: true,
            name: 'stellar_accounts_address_unique',
          }),
        ],
        [
          { identity: 1, isPrimary: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { isPrimary: true, disconnectedAt: null },
            name: 'stellar_accounts_one_primary_per_identity',
          }),
        ],
      ]),
    );
  });
});
