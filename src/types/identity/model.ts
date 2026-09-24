import type { HydratedDocument, Types } from 'mongoose';

type IdentityStatus = 'active' | 'suspended' | 'deleted';

interface IdentityRecord {
  name: string | null;
  status: IdentityStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StellarAccountRecord {
  identity: Types.ObjectId;
  address: string;
  isPrimary: boolean;
  connectedAt: Date;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type IdentityDocument = HydratedDocument<IdentityRecord>;
type StellarAccountDocument = HydratedDocument<StellarAccountRecord>;

export type {
  IdentityDocument,
  IdentityRecord,
  IdentityStatus,
  StellarAccountDocument,
  StellarAccountRecord,
};
