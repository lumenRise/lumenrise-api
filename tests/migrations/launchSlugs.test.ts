import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import LaunchName from '../../src/models/LaunchName';
import TokenImage from '../../src/models/TokenImage';
import launchSlugs from '../../src/migrations/20261022LaunchSlugs';

vi.mock('../../src/models/Launch', () => ({
  default: {
    find: vi.fn(),
    collection: { updateOne: vi.fn(), updateMany: vi.fn() },
    createIndexes: vi.fn(),
  },
}));

vi.mock('../../src/models/LaunchName', () => ({
  default: {
    find: vi.fn(),
    collection: { updateMany: vi.fn(), updateOne: vi.fn() },
    updateOne: vi.fn(),
    createIndexes: vi.fn(),
  },
}));

vi.mock('../../src/models/TokenImage', () => ({ default: { createIndexes: vi.fn() } }));

const first = {
  _id: 'one',
  chain: 'stellar',
  network: 'testnet',
  factoryContractId: 'factory',
  factoryIndex: 1,
  contractId: 'contract-one',
  owner: 'owner',
  metadata: { name: 'Blue Project', logo: 'https://images.example/logo.png' },
};

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(Launch.find).mockReturnValue({
    sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([first]) }),
  } as never);

  vi.mocked(LaunchName.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
});

it('backfills slugs before attempting the unique index', async (): Promise<void> => {
  await launchSlugs.up();

  expect(Launch.collection.updateOne).toHaveBeenCalledWith(
    { _id: 'one', slug: { $exists: false } },
    { $set: { slug: 'blue-project' } },
  );
  expect(vi.mocked(Launch.collection.updateOne).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(Launch.createIndexes).mock.invocationCallOrder[0]!,
  );
  expect(TokenImage.createIndexes).toHaveBeenCalledOnce();
});

it('repairs existing factory collisions without deleting either launch', async (): Promise<void> => {
  const digest = createHash('sha256')
    .update('stellar:testnet:contract-two')
    .digest('hex')
    .slice(0, 12);

  vi.mocked(Launch.find).mockReturnValue({
    sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { ...first, slug: 'blue-project' },
        { ...first, _id: 'two', contractId: 'contract-two', factoryIndex: 2, slug: 'blue-project' },
      ]),
    }),
  } as never);

  await launchSlugs.up();

  expect(Launch.collection.updateOne).toHaveBeenCalledExactlyOnceWith(
    { _id: 'two', slug: 'blue-project' },
    { $set: { slug: `blue-project-${digest}` } },
  );
});

it('preserves another user reservation and keeps chain namespaces separate', async (): Promise<void> => {
  vi.mocked(LaunchName.find).mockReturnValue({
    lean: vi.fn().mockResolvedValue([
      {
        _id: 'reservation',
        chain: 'stellar',
        network: 'testnet',
        slug: 'blue-project',
        status: 'reserved',
        ownerAddress: 'other-owner',
        publicUrl: 'other-logo',
      },
    ]),
  } as never);

  vi.mocked(Launch.find).mockReturnValue({
    sort: vi.fn().mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          first,
          { ...first, _id: 'base', chain: 'base', contractId: 'base-contract' },
        ]),
    }),
  } as never);

  await launchSlugs.up();

  expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
    1,
    { _id: 'one', slug: { $exists: false } },
    { $set: { slug: expect.stringMatching(/^blue-project-[a-f0-9]{12}$/) } },
  );
  expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
    2,
    { _id: 'base', slug: { $exists: false } },
    { $set: { slug: 'blue-project' } },
  );
});

it('refuses to rename a conflicting API prelaunch automatically', async (): Promise<void> => {
  vi.mocked(LaunchName.find).mockReturnValue({
    lean: vi.fn().mockResolvedValue([
      {
        _id: 'reservation',
        chain: 'stellar',
        network: 'testnet',
        slug: 'blue-project',
        status: 'reserved',
        ownerAddress: 'other-owner',
        publicUrl: 'other-logo',
      },
    ]),
  } as never);

  vi.mocked(Launch.find).mockReturnValue({
    sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ ...first, prelaunchId: 'api-image' }]),
    }),
  } as never);

  await expect(launchSlugs.up()).rejects.toThrow('reserved API launch');

  expect(Launch.collection.updateOne).not.toHaveBeenCalled();
});

it('preserves duplicate indexed claim history without keeping duplicate active slug keys', async (): Promise<void> => {
  const claim = {
    chain: 'stellar',
    network: 'testnet',
    slug: 'blue-project',
    contractId: 'contract-one',
    ownerAddress: 'owner',
    publicUrl: 'https://images.example/logo.png',
    status: 'indexed',
    prelaunchId: null,
  };

  vi.mocked(Launch.find).mockReturnValue({
    sort: vi
      .fn()
      .mockReturnValue({ lean: vi.fn().mockResolvedValue([{ ...first, slug: 'blue-project' }]) }),
  } as never);

  vi.mocked(LaunchName.find).mockReturnValue({
    lean: vi.fn().mockResolvedValue([
      { ...claim, _id: 'claim-one' },
      { ...claim, _id: 'claim-two' },
    ]),
  } as never);

  await launchSlugs.up();

  expect(LaunchName.collection.updateOne).toHaveBeenCalledExactlyOnceWith(
    { _id: 'claim-one', slug: 'blue-project' },
    {
      $set: {
        slug: expect.stringMatching(/^blue-project-legacy-[a-f0-9]{12}$/),
        status: 'expired',
      },
    },
  );
  expect(Launch.collection.updateOne).not.toHaveBeenCalled();
});
