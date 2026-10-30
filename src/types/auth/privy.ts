import type { Types } from 'mongoose';

interface PrivyIdentityRecord {
  userId: string;
  identity: Types.ObjectId;
}

interface EvmAccountRecord {
  identity: Types.ObjectId;
  address: string;
  isPrimary: boolean;
  connectedAt: Date;
  disconnectedAt: Date | null;
}

export type { EvmAccountRecord, PrivyIdentityRecord };
