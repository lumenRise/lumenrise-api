import SorobanTransactionEvidence from '../../../../models/SorobanTransactionEvidence.js';

const LEASE_MS = 60_000;

const claimSorobanEvidence = async () => {
  const now = new Date();
  return SorobanTransactionEvidence.findOneAndUpdate(
    {
      $or: [
        { rpcStatus: 'queued', scheduledAt: { $lte: now } },
        { rpcStatus: 'running', leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: { rpcStatus: 'running', leaseUntil: new Date(now.getTime() + LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { scheduledAt: 1 }, returnDocument: 'after' },
  );
};

export default claimSorobanEvidence;
