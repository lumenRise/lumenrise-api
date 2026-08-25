import type { ClientSession, HydratedDocument } from 'mongoose';

interface DatabaseMigrationRecord {
  name: string;
  appliedAt: Date;
}

interface MigrationDefinition {
  name: string;
  up: () => Promise<void>;
}

type DatabaseMigrationDocument = HydratedDocument<DatabaseMigrationRecord>;
type DatabaseTransaction<T> = (session: ClientSession) => Promise<T>;

export type {
  DatabaseMigrationDocument,
  DatabaseMigrationRecord,
  DatabaseTransaction,
  MigrationDefinition,
};
