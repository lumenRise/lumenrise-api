import { beforeEach, expect, it, vi } from 'vitest';

import DatabaseMigration from '../../src/models/DatabaseMigration';
import runDatabaseMigrations from '../../src/migrations/runDatabaseMigrations';
import createCurrentIndexes from '../../src/migrations/20261012CreateCurrentIndexes';

vi.mock('../../src/logger', (): object => ({ default: { info: vi.fn() } }));

vi.mock('../../src/models/DatabaseMigration', (): object => ({
  default: { createIndexes: vi.fn(), exists: vi.fn(), updateOne: vi.fn() },
}));

vi.mock('../../src/migrations/20261012CreateCurrentIndexes', (): object => ({
  default: { name: '20261012-create-current-indexes', up: vi.fn() },
}));

beforeEach((): void => {
  vi.resetAllMocks();
});

it('installs the consolidated indexes once on a fresh database and records completion', async (): Promise<void> => {
  await runDatabaseMigrations();

  expect(createCurrentIndexes.up).toHaveBeenCalledOnce();

  expect(DatabaseMigration.exists).toHaveBeenCalledExactlyOnceWith({
    name: '20261012-create-current-indexes',
  });

  expect(DatabaseMigration.updateOne).toHaveBeenCalledExactlyOnceWith(
    { name: '20261012-create-current-indexes' },
    {
      $setOnInsert: {
        name: '20261012-create-current-indexes',
        appliedAt: expect.any(Date),
      },
    },
    { upsert: true },
  );

  expect(vi.mocked(createCurrentIndexes.up).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(DatabaseMigration.updateOne).mock.invocationCallOrder[0]!,
  );
});

it('preserves the applied baseline name and skips it on an existing server', async (): Promise<void> => {
  vi.mocked(DatabaseMigration.exists).mockResolvedValue({ _id: 'applied' } as never);

  await runDatabaseMigrations();

  expect(createCurrentIndexes.name).toBe('20261012-create-current-indexes');

  expect(createCurrentIndexes.up).not.toHaveBeenCalled();

  expect(DatabaseMigration.exists).toHaveBeenCalledTimes(1);

  expect(DatabaseMigration.updateOne).not.toHaveBeenCalled();
});

it('does not record completion when consolidated index creation fails', async (): Promise<void> => {
  vi.mocked(createCurrentIndexes.up).mockRejectedValueOnce(new Error('Index creation failed'));

  await expect(runDatabaseMigrations()).rejects.toThrow('Index creation failed');

  expect(DatabaseMigration.updateOne).not.toHaveBeenCalled();
});
