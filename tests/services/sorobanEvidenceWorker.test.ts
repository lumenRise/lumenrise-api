import { Types } from 'mongoose';
import { Networks, rpc } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SorobanTransactionEvidence from '../../src/models/SorobanTransactionEvidence.js';
import { processSorobanEvidence } from '../../src/services/stellar/sorobanEvidenceWorker.js';

const getNetwork = vi.fn();
const getTransaction = vi.fn();
vi.mock('@stellar/stellar-sdk', async (load) => ({
  ...(await load()),
  rpc: {
    Server: vi.fn(
      class {
        getNetwork = getNetwork;
        getTransaction = getTransaction;
      },
    ),
  },
}));
vi.mock('../../src/models/SorobanTransactionEvidence.js', () => ({
  default: { findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
}));

const createCandidate = (attempts = 1) => ({
  _id: new Types.ObjectId(),
  transactionHash: 'a'.repeat(64),
  leaseUntil: new Date('2026-09-26T12:01:00Z'),
  attempts,
});

describe('Soroban evidence worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNetwork.mockResolvedValue({ passphrase: Networks.TESTNET });
    vi.mocked(SorobanTransactionEvidence.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
  });

  it('stores raw event XDR and return value without assigning a project or score', async () => {
    const candidate = createCandidate();
    vi.mocked(SorobanTransactionEvidence.findOneAndUpdate).mockResolvedValue(candidate as never);
    const event = {
      contractId: { toXdrObject: () => Buffer.alloc(32, 1) },
      toXdr: () => 'event-xdr',
    };
    const returnValue = { toXdr: () => 'return-xdr' };
    getTransaction.mockResolvedValue({
      status: 'SUCCESS',
      txHash: candidate.transactionHash,
      ledger: 123,
      envelopeXdr: { toXdr: () => 'envelope-xdr' },
      resultMetaXdr: { toXdr: () => 'meta-xdr' },
      returnValue,
      events: { contractEventsXdr: [[event]] },
    });

    await processSorobanEvidence();

    expect(rpc.Server).toHaveBeenCalledWith(expect.any(String), { timeout: 10_000 });
    expect(SorobanTransactionEvidence.updateOne).toHaveBeenCalledWith(
      { _id: candidate._id, rpcStatus: 'running', leaseUntil: candidate.leaseUntil },
      {
        $set: expect.objectContaining({
          rpcStatus: 'success',
          ledger: 123,
          envelopeXdr: 'envelope-xdr',
          resultMetaXdr: 'meta-xdr',
          returnValueXdr: 'return-xdr',
          events: [
            expect.objectContaining({
              contractId: expect.stringMatching(/^C[A-Z2-7]{55}$/),
              eventXdr: 'event-xdr',
              operationIndex: 0,
              eventIndex: 0,
            }),
          ],
        }),
      },
      { runValidators: true },
    );
  });

  it('marks an exhausted historical transaction as not found, not zero activity', async () => {
    const candidate = createCandidate(3);
    vi.mocked(SorobanTransactionEvidence.findOneAndUpdate).mockResolvedValue(candidate as never);
    getTransaction.mockResolvedValue({ status: 'NOT_FOUND', txHash: candidate.transactionHash });

    await processSorobanEvidence();

    expect(SorobanTransactionEvidence.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      { $set: expect.objectContaining({ rpcStatus: 'not_found', events: [] }) },
      { runValidators: true },
    );
  });

  it('keeps the envelope for an on-chain failed transaction without treating it as successful', async () => {
    const candidate = createCandidate();
    vi.mocked(SorobanTransactionEvidence.findOneAndUpdate).mockResolvedValue(candidate as never);
    getTransaction.mockResolvedValue({
      status: 'FAILED',
      txHash: candidate.transactionHash,
      ledger: 124,
      envelopeXdr: { toXdr: () => 'failed-envelope' },
      resultMetaXdr: { toXdr: () => 'failed-meta' },
      events: { contractEventsXdr: [] },
    });

    await processSorobanEvidence();

    expect(SorobanTransactionEvidence.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $set: expect.objectContaining({
          rpcStatus: 'failed',
          envelopeXdr: 'failed-envelope',
          resultMetaXdr: 'failed-meta',
          returnValueXdr: null,
        }),
      },
      { runValidators: true },
    );
  });

  it('retries recent not-found lookups without losing the candidate', async () => {
    const candidate = createCandidate();
    vi.mocked(SorobanTransactionEvidence.findOneAndUpdate).mockResolvedValue(candidate as never);
    getTransaction.mockResolvedValue({ status: 'NOT_FOUND', txHash: candidate.transactionHash });

    await processSorobanEvidence();

    expect(SorobanTransactionEvidence.updateOne).toHaveBeenCalledWith(
      { _id: candidate._id, rpcStatus: 'running', leaseUntil: candidate.leaseUntil },
      { $set: expect.objectContaining({ rpcStatus: 'queued', leaseUntil: null }) },
    );
  });

  it('does not store data from another network', async () => {
    const candidate = createCandidate(3);
    vi.mocked(SorobanTransactionEvidence.findOneAndUpdate).mockResolvedValue(candidate as never);
    getNetwork.mockResolvedValue({ passphrase: Networks.PUBLIC });

    await processSorobanEvidence();

    expect(getTransaction).not.toHaveBeenCalled();
    expect(SorobanTransactionEvidence.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      { $set: expect.objectContaining({ rpcStatus: 'unavailable' }) },
      { runValidators: true },
    );
  });
});
