import { beforeEach, expect, it, vi } from 'vitest';

import DatabaseMigration from '../../src/models/DatabaseMigration';
import runDatabaseMigrations from '../../src/migrations/runDatabaseMigrations';
import statsTradeIndexes from '../../src/migrations/20261101StatsTradeIndexes';
import createCurrentIndexes from '../../src/migrations/20261012CreateCurrentIndexes';
import basePoolHistoryReplay from '../../src/migrations/20261101BasePoolHistoryReplay';

vi.mock('../../src/logger', () => ({ default: { info: vi.fn() } }));

vi.mock('../../src/models/DatabaseMigration', () => ({
  default: { createIndexes: vi.fn(), exists: vi.fn(), updateOne: vi.fn() },
}));

vi.mock('../../src/migrations/20261012CreateCurrentIndexes', () => ({
  default: { name: '20261012-create-current-indexes', up: vi.fn() },
}));

vi.mock('../../src/migrations/20261101StatsTradeIndexes', () => ({
  default: { name: '20261101-stats-trade-indexes', up: vi.fn() },
}));

vi.mock('../../src/migrations/20261101BasePoolHistoryReplay', () => ({
  default: { name: '20261101-base-pool-history-replay', up: vi.fn() },
}));

beforeEach((): void => {
  vi.resetAllMocks();
});

it('installs indexes before scheduling replay and records each successful migration', async (): Promise<void> => {
  await runDatabaseMigrations();

  expect(vi.mocked(createCurrentIndexes.up).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(statsTradeIndexes.up).mock.invocationCallOrder[0]!,
  );

  expect(vi.mocked(statsTradeIndexes.up).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(basePoolHistoryReplay.up).mock.invocationCallOrder[0]!,
  );

  expect(DatabaseMigration.updateOne).toHaveBeenCalledTimes(3);

  expect(DatabaseMigration.updateOne).toHaveBeenLastCalledWith(
    { name: basePoolHistoryReplay.name },
    { $setOnInsert: { name: basePoolHistoryReplay.name, appliedAt: expect.any(Date) } },
    { upsert: true },
  );
});

it('retains the applied baseline name and runs only the two pending migrations', async (): Promise<void> => {
  vi.mocked(DatabaseMigration.exists).mockResolvedValueOnce({ _id: 'applied' } as never);

  await runDatabaseMigrations();

  expect(createCurrentIndexes.name).toBe('20261012-create-current-indexes');
  expect(createCurrentIndexes.up).not.toHaveBeenCalled();
  expect(statsTradeIndexes.up).toHaveBeenCalledOnce();
  expect(basePoolHistoryReplay.up).toHaveBeenCalledOnce();
  expect(DatabaseMigration.updateOne).toHaveBeenCalledTimes(2);
});

it('does not repeat replay or index migrations recorded in database history', async (): Promise<void> => {
  vi.mocked(DatabaseMigration.exists).mockResolvedValue({ _id: 'applied' } as never);

  await runDatabaseMigrations();

  expect(createCurrentIndexes.up).not.toHaveBeenCalled();
  expect(statsTradeIndexes.up).not.toHaveBeenCalled();
  expect(basePoolHistoryReplay.up).not.toHaveBeenCalled();
  expect(DatabaseMigration.updateOne).not.toHaveBeenCalled();
});

it('does not schedule replay if its pending index migration fails', async (): Promise<void> => {
  vi.mocked(statsTradeIndexes.up).mockRejectedValueOnce(new Error('Index creation failed'));

  await expect(runDatabaseMigrations()).rejects.toThrow('Index creation failed');

  expect(basePoolHistoryReplay.up).not.toHaveBeenCalled();

  expect(DatabaseMigration.updateOne).not.toHaveBeenCalledWith(
    { name: statsTradeIndexes.name },
    expect.anything(),
    expect.anything(),
  );
});

it('does not mark a replay that could not acquire an idle cursor as applied', async (): Promise<void> => {
  vi.mocked(basePoolHistoryReplay.up).mockRejectedValueOnce(new Error('Writer is active'));

  await expect(runDatabaseMigrations()).rejects.toThrow('Writer is active');

  expect(DatabaseMigration.updateOne).not.toHaveBeenCalledWith(
    { name: basePoolHistoryReplay.name },
    expect.anything(),
    expect.anything(),
  );
});
