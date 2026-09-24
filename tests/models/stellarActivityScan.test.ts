import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import StellarActivityScan from '../../src/models/StellarActivityScan.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('StellarActivityScan model', () => {
  it('starts with an empty aggregate and no cursor', async () => {
    const scan = new StellarActivityScan({
      identity: new Types.ObjectId(),
      address,
      sourceUrl: 'https://horizon-testnet.stellar.org',
      status: 'queued',
      active: true,
    });

    await scan.validate();

    expect(scan.cursor).toBeNull();
    expect(scan.summary).toMatchObject({ scope: 'scanned_pages', operationCount: 0 });
    expect(scan.toObject().summary.operationTypeCounts).toEqual({});
    expect(scan.pagesProcessed).toBe(0);
  });

  it('rejects an active completed scan', async () => {
    const scan = new StellarActivityScan({
      identity: new Types.ObjectId(),
      address,
      sourceUrl: 'https://horizon-testnet.stellar.org',
      status: 'completed',
      active: true,
      completedAt: new Date(),
    });

    await expect(scan.validate()).rejects.toMatchObject({ errors: { active: expect.anything() } });
  });

  it('allows one active scan per identity', () => {
    expect(StellarActivityScan.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { identity: 1, active: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { active: true },
          }),
        ],
      ]),
    );
  });
});
