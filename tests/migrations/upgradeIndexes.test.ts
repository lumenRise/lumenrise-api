import { beforeEach, describe, expect, it, vi } from 'vitest';

import TokenImage from '../../src/models/TokenImage';
import upgradeIndexes from '../../src/migrations/20261012AuthProviderAndTokenImageIndexes';

vi.mock('../../src/models/TokenImage', () => ({
  default: { collection: { indexes: vi.fn(), dropIndex: vi.fn() } },
}));

describe('legacy token image index upgrade', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows a fresh database with no token image collection', async () => {
    vi.mocked(TokenImage.collection.indexes).mockRejectedValue({ code: 26 });
    await expect(upgradeIndexes.up()).resolves.toBeUndefined();
    expect(TokenImage.collection.dropIndex).not.toHaveBeenCalled();
  });

  it('removes only the obsolete non-unique asset index', async () => {
    vi.mocked(TokenImage.collection.indexes).mockResolvedValue([
      { name: '_id_' },
      { name: 'token_images_asset' },
      { name: 'token_images_owner' },
    ] as never);
    await upgradeIndexes.up();
    expect(TokenImage.collection.dropIndex).toHaveBeenCalledExactlyOnceWith('token_images_asset');
  });

  it('does not drop indexes that already have the new one-to-one constraint', async () => {
    vi.mocked(TokenImage.collection.indexes).mockResolvedValue([
      { name: 'token_images_asset_unique' },
    ] as never);
    await upgradeIndexes.up();
    expect(TokenImage.collection.dropIndex).not.toHaveBeenCalled();
  });

  it('does not mistake database connection errors for an empty database', async () => {
    vi.mocked(TokenImage.collection.indexes).mockRejectedValue(new Error('Database unavailable'));
    await expect(upgradeIndexes.up()).rejects.toThrow('Database unavailable');
    expect(TokenImage.collection.dropIndex).not.toHaveBeenCalled();
  });
  it('allows another application instance to remove the same legacy index first', async () => {
    vi.mocked(TokenImage.collection.indexes).mockResolvedValue([
      { name: 'token_images_asset' },
    ] as never);
    vi.mocked(TokenImage.collection.dropIndex).mockRejectedValue({ code: 27 });
    await expect(upgradeIndexes.up()).resolves.toBeUndefined();
  });

  it('propagates failures while removing the old index', async () => {
    vi.mocked(TokenImage.collection.indexes).mockResolvedValue([
      { name: 'token_images_asset' },
    ] as never);
    vi.mocked(TokenImage.collection.dropIndex).mockRejectedValue(new Error('Index removal failed'));
    await expect(upgradeIndexes.up()).rejects.toThrow('Index removal failed');
  });
});
