import type { HydratedDocument, Types } from 'mongoose';

interface ManualRefreshCooldownRecord {
  identity: Types.ObjectId;
  target: string;
  nextAllowedAt: Date;
}

type ManualRefreshCooldownDocument = HydratedDocument<ManualRefreshCooldownRecord>;

interface ManualRefreshReservation {
  allowed: boolean;
  retryAt: Date | null;
  reservedUntil: Date | null;
}

export type {
  ManualRefreshCooldownDocument,
  ManualRefreshCooldownRecord,
  ManualRefreshReservation,
};
