import { Schema, model } from 'mongoose';

import type { DatabaseMigrationRecord } from '../types/database/migration.js';

const databaseMigrationSchema = new Schema<DatabaseMigrationRecord>(
  {
    name: {
      type: String,
      required: true,
      immutable: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
      immutable: true,
    },
  },
  {
    versionKey: false,
  },
);

databaseMigrationSchema.index(
  { name: 1 },
  { unique: true, name: 'database_migrations_name_unique' },
);

const DatabaseMigration = model<DatabaseMigrationRecord>(
  'DatabaseMigration',
  databaseMigrationSchema,
);

export default DatabaseMigration;
