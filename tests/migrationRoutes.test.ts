import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import DatabaseMigration from '../src/models/DatabaseMigration';

vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/models/DatabaseMigration', () => ({ default: { distinct: vi.fn() } }));

describe('migration names endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns every database migration name including other repositories and removed files without authentication', async () => {
    const migrations = ['create-current-indexes', 'removed-migration', 'reputation-indexes'];

    vi.mocked(DatabaseMigration.distinct).mockResolvedValue(migrations);

    const response = await request(app).get('/v1/migrations');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.result).toEqual({ migrations });
    expect(DatabaseMigration.distinct).toHaveBeenCalledExactlyOnceWith('name');
  });

  it('returns an empty list when the database has no migration records', async () => {
    vi.mocked(DatabaseMigration.distinct).mockResolvedValue([]);

    const response = await request(app).get('/v1/migrations');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ migrations: [] });
  });

  it('reports a database failure instead of returning an empty list', async () => {
    vi.mocked(DatabaseMigration.distinct).mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/v1/migrations');

    expect(response.status).toBe(503);
    expect(response.body.result).toEqual({});
  });
});
