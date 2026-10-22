import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import LaunchName from '../../src/models/LaunchName';
import TokenImage from '../../src/models/TokenImage';
import launchSlugs from '../../src/migrations/20261022LaunchSlugs';

vi.mock('../../src/models/Launch', () => ({
  default: { find: vi.fn(), collection: { updateOne: vi.fn() }, createIndexes: vi.fn() },
}));
vi.mock('../../src/models/LaunchName', () => ({ default: { createIndexes: vi.fn(), updateOne: vi.fn() } }));
vi.mock('../../src/models/TokenImage', () => ({ default: { createIndexes: vi.fn() } }));

const existing = {
  _id: 'one',
  network: 'testnet',
  contractId: 'contract-one',
  owner: 'owner',
  metadata: { name: 'Blue Man', logo: 'https://images.example/logo.png' },
};

describe('launch slug migration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('backfills canonical slugs and claims existing names', async () => {
    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([existing]) }),
    } as never);

    await launchSlugs.up();

    expect(TokenImage.createIndexes).toHaveBeenCalledOnce();

    expect(Launch.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'one', slug: { $exists: false } },
      { $set: { slug: 'blue-man' } },
    );
    expect(LaunchName.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'testnet', slug: 'blue-man' }),
      expect.objectContaining({ $set: { contractId: 'contract-one', status: 'indexed' } }),
      { upsert: true },
    );
  });

  it('keeps both legacy launches with distinct stable slugs', async () => {
    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
        existing,
        { ...existing, _id: 'two', contractId: 'contract-two', metadata: { ...existing.metadata, name: 'blue-man' } },
      ]) }),
    } as never);

    await launchSlugs.up();

    expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: 'one', slug: { $exists: false } },
      { $set: { slug: 'blue-man' } },
    );
    expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'two', slug: { $exists: false } },
      { $set: { slug: expect.stringMatching(/^blue-man-[a-f0-9]{12}$/) } },
    );
    expect(LaunchName.updateOne).toHaveBeenCalledTimes(2);

    const writes = vi.mocked(Launch.collection.updateOne).mock.calls.map((call) => call[1]);

    vi.clearAllMocks();

    await launchSlugs.up();

    expect(vi.mocked(Launch.collection.updateOne).mock.calls.map((call) => call[1])).toEqual(writes);
  });

  it('preserves already published slugs on a partial migration retry', async () => {
    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
        existing,
        { ...existing, _id: 'two', contractId: 'contract-two', slug: 'blue-man' },
      ]) }),
    } as never);

    await launchSlugs.up();

    expect(Launch.collection.updateOne).toHaveBeenCalledOnce();
    expect(Launch.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'one', slug: { $exists: false } },
      { $set: { slug: expect.stringMatching(/^blue-man-[a-f0-9]{12}$/) } },
    );
  });

  it('bounds generated legacy slugs to 100 characters', async () => {
    const metadata = { ...existing.metadata, name: 'a'.repeat(100) };

    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
        { ...existing, metadata },
        { ...existing, _id: 'two', contractId: 'contract-two', metadata },
      ]) }),
    } as never);

    await launchSlugs.up();

    expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'two', slug: { $exists: false } },
      { $set: { slug: expect.stringMatching(/^a{87}-[a-f0-9]{12}$/) } },
    );
  });

  it('assigns a stable fallback to unusable legacy names', async () => {
    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
        { ...existing, metadata: { ...existing.metadata, name: '---' } },
      ]) }),
    } as never);

    await launchSlugs.up();

    expect(Launch.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'one', slug: { $exists: false } },
      { $set: { slug: expect.stringMatching(/^legacy-launch-[a-f0-9]{12}$/) } },
    );
  });


  it('does not take another project natural slug when generating a suffix', async () => {
    const digest = createHash('sha256').update('testnet:contract-two').digest('hex').slice(0, 12);
    const natural = `blue-man-${digest}`;

    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
        existing,
        { ...existing, _id: 'two', contractId: 'contract-two' },
        { ...existing, _id: 'three', contractId: 'contract-three', metadata: { ...existing.metadata, name: natural } },
      ]) }),
    } as never);

    await launchSlugs.up();

    expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'two', slug: { $exists: false } },
      { $set: { slug: `${natural}-1` } },
    );
    expect(Launch.collection.updateOne).toHaveBeenNthCalledWith(
      3,
      { _id: 'three', slug: { $exists: false } },
      { $set: { slug: natural } },
    );
  });

});
