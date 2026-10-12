import { beforeEach, describe, expect, it, vi } from 'vitest';

import DatabaseMigration from '../../src/models/DatabaseMigration';
import runDatabaseMigrations from '../../src/migrations/runDatabaseMigrations';
import createCurrentIndexes from '../../src/migrations/20261012CreateCurrentIndexes';
import upgradeIndexes from '../../src/migrations/20261012AuthProviderAndTokenImageIndexes';

vi.mock('../../src/models/DatabaseMigration', () => ({
  default: { createIndexes: vi.fn(), exists: vi.fn(), updateOne: vi.fn() },
}));
vi.mock('../../src/migrations/20261012CreateCurrentIndexes', () => ({
  default: { name: '20261012-create-current-indexes', up: vi.fn() },
}));
vi.mock('../../src/migrations/20261012AuthProviderAndTokenImageIndexes', () => ({
  default: { name: '20261012-auth-provider-and-token-image-indexes', up: vi.fn() },
}));

describe('consolidated database migrations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('upgrades old indexes before installing the baseline and records each only after success', async () => {
    await runDatabaseMigrations();
    expect(upgradeIndexes.up).toHaveBeenCalledTimes(1);
    expect(createCurrentIndexes.up).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upgradeIndexes.up).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createCurrentIndexes.up).mock.invocationCallOrder[0]!,
    );
    expect(DatabaseMigration.updateOne).toHaveBeenCalledTimes(2);
    expect(DatabaseMigration.updateOne).toHaveBeenLastCalledWith(
      { name: createCurrentIndexes.name },
      { $setOnInsert: { name: createCurrentIndexes.name, appliedAt: expect.any(Date) } },
      { upsert: true },
    );
  });

  it('does not rerun migrations already present in database history', async () => {
    vi.mocked(DatabaseMigration.exists).mockResolvedValue({ _id: 'applied' } as never);
    await runDatabaseMigrations();
    expect(upgradeIndexes.up).not.toHaveBeenCalled();
    expect(createCurrentIndexes.up).not.toHaveBeenCalled();
    expect(DatabaseMigration.updateOne).not.toHaveBeenCalled();
  });

  it('installs the baseline when the old upgrade has already been applied', async () => {
    vi.mocked(DatabaseMigration.exists)
      .mockResolvedValueOnce({ _id: 'old-history' } as never)
      .mockResolvedValueOnce(null);
    await runDatabaseMigrations();
    expect(upgradeIndexes.up).not.toHaveBeenCalled();
    expect(createCurrentIndexes.up).toHaveBeenCalledTimes(1);
    expect(DatabaseMigration.updateOne).toHaveBeenCalledTimes(1);
  });

  it('does not record an unsuccessful baseline as applied', async () => {
    vi.mocked(createCurrentIndexes.up).mockRejectedValueOnce(new Error('Index creation failed'));
    await expect(runDatabaseMigrations()).rejects.toThrow('Index creation failed');
    expect(DatabaseMigration.updateOne).not.toHaveBeenCalledWith(
      { name: createCurrentIndexes.name },
      expect.anything(),
      expect.anything(),
    );
  });

  it('does not install or record the baseline if upgrading the old index fails', async () => {
    vi.mocked(upgradeIndexes.up).mockRejectedValueOnce(new Error('Index upgrade failed'));
    await expect(runDatabaseMigrations()).rejects.toThrow('Index upgrade failed');
    expect(createCurrentIndexes.up).not.toHaveBeenCalled();
    expect(DatabaseMigration.updateOne).not.toHaveBeenCalled();
  });
});
