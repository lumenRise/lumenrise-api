import { describe, expect, it } from 'vitest';

import Identity from '../../src/models/Identity.js';

describe('Identity model', () => {
  it('applies safe defaults to a new identity', async () => {
    const identity = new Identity();

    await identity.validate();

    expect(identity.status).toBe('active');
    expect(identity.deletedAt).toBeNull();
  });

  it('declares the identity status index', () => {
    expect(Identity.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { status: 1, _id: 1 },
          expect.objectContaining({
            name: 'identities_status_id',
          }),
        ],
      ]),
    );
  });
});
