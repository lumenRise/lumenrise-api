import type { Types } from 'mongoose';

interface SorobanEventEvidence {
  operationIndex: number;
  eventIndex: number;
  contractId: string | null;
  eventXdr: string;
}

type SorobanRpcStatus = 'queued' | 'running' | 'success' | 'failed' | 'not_found' | 'unavailable';

interface SorobanInvocationEvidence {
  depth: number;
  type: string;
  contractAddress: string | null;
  functionName: string | null;
}

interface SorobanAuthorizationEvidence {
  credentialType: string;
  address: string | null;
  delegates: Array<{ address: string; depth: number }>;
  invocations: SorobanInvocationEvidence[];
}

interface SorobanOperationEvidence {
  operationIndex: number;
  sourceAccount: string;
  explicitSourceAccount: string | null;
  hostFunctionType: string;
  contractAddress: string | null;
  functionName: string | null;
  authorizations: SorobanAuthorizationEvidence[];
}

interface SorobanEnvelopeEvidence {
  envelopeType: string;
  transactionSource: string;
  feeSource: string | null;
  operations: SorobanOperationEvidence[];
}

interface SorobanTransactionEvidenceRecord {
  scan: Types.ObjectId;
  requestedByIdentity: Types.ObjectId;
  address: string;
  sourceUrl: string;
  transactionHash: string;
  operationIds: string[];
  initiatedOperation: boolean;
  observedAt: Date;
  rpcStatus: SorobanRpcStatus;
  attempts: number;
  scheduledAt: Date;
  leaseUntil: Date | null;
  ledger: number | null;
  envelopeXdr: string | null;
  resultMetaXdr: string | null;
  returnValueXdr: string | null;
  events: SorobanEventEvidence[];
  createdAt: Date;
}

type SorobanTransactionEvidenceInput = Omit<SorobanTransactionEvidenceRecord, 'createdAt'>;

interface SorobanEvidenceResult {
  scanId: string;
  address: string;
  ownershipVerified: false;
  source: 'horizon_and_stellar_rpc';
  scanStatus: 'queued' | 'running' | 'completed' | 'failed';
  availableHistoryScanned: boolean;
  coverage: {
    discoveredTransactions: number;
    rpcQueued: number;
    rpcRunning: number;
    rpcSuccess: number;
    rpcFailed: number;
    rpcNotFound: number;
    rpcUnavailable: number;
  };
  items: Array<{
    transactionHash: string;
    operationIds: string[];
    initiatedOperation: boolean;
    observedAt: string;
    rpcStatus: SorobanRpcStatus;
    attempts: number;
    ledger: number | null;
    returnValueXdr: string | null;
    envelope: SorobanEnvelopeEvidence | null;
    events: SorobanEventEvidence[];
  }>;
  nextCursor: string | null;
}

export type {
  SorobanEventEvidence,
  SorobanEnvelopeEvidence,
  SorobanInvocationEvidence,
  SorobanRpcStatus,
  SorobanTransactionEvidenceRecord,
  SorobanTransactionEvidenceInput,
  SorobanEvidenceResult,
};
