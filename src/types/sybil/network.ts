import type { HydratedDocument, Types } from 'mongoose';

type StellarPaymentDirection = 'incoming' | 'outgoing';

interface StellarPaymentFactRecord {
  scan: Types.ObjectId;
  requestedByIdentity: Types.ObjectId;
  address: string;
  counterparty: string;
  sourceUrl: string;
  operationId: string;
  transactionHash: string;
  direction: StellarPaymentDirection;
  observedAt: Date;
  createdAt: Date;
}

type StellarPaymentFactDocument = HydratedDocument<StellarPaymentFactRecord>;

export type { StellarPaymentDirection, StellarPaymentFactDocument, StellarPaymentFactRecord };
