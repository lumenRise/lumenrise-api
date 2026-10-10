import type { Types } from 'mongoose';

interface LaunchDraftRecord {
  schemaVersion: 1;
  ownerIdentityId: Types.ObjectId;
  ownerAddress: string;
  network: 'testnet' | 'public';
  method: 'bonding';
  status: 'editing' | 'submitted' | 'confirmed' | 'unmatched' | 'failed';
  data: Record<string, unknown>;
  imageId: Types.ObjectId | null;
  params: Record<string, unknown> | null;
  assetContractId: string | null;
  transactionHash: string | null;
  verifiedContractId: string | null;
  launchContractId: string | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  nextMatchAt: Date | null;
  matchAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export type { LaunchDraftRecord };
