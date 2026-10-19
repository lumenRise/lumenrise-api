import type { HydratedDocument, Types } from 'mongoose';

import type { StellarNetwork } from '../network/configuration';

type StellarPaymentDirection = 'incoming' | 'outgoing';

interface StellarPaymentFactRecord {
  network: StellarNetwork;
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
