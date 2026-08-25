import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import env from '../../src/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/db.js';

describe('database connection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connects to the configured MongoDB database', async () => {
    const connect = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectDatabase();

    expect(connect).toHaveBeenCalledWith(env.DB_URI, { dbName: env.DB_NAME });
  });

  it('disconnects through Mongoose', async () => {
    const disconnect = vi.spyOn(mongoose, 'disconnect').mockResolvedValue(undefined);

    await disconnectDatabase();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
