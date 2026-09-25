import { withDatabaseTransaction } from '../../db.js';
import StellarPaymentFact from '../../models/StellarPaymentFact.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { StellarOperationsResult } from '../../types/stellar/operations.js';
import SorobanTransactionEvidence from '../../models/SorobanTransactionEvidence.js';
import type { SorobanTransactionEvidenceInput } from '../../types/stellar/soroban.js';
import extractStellarPaymentFacts from '../../utils/sybil/extractStellarPaymentFacts.js';
import type {
  StellarActivityMergeResult,
  StellarActivityScanDocument,
} from '../../types/stellar/scan.js';

const persistStellarPaymentPage = async (
  scan: StellarActivityScanDocument,
  page: StellarOperationsResult,
  merged: StellarActivityMergeResult,
  now: Date,
  sorobanEvidence: SorobanTransactionEvidenceInput[] = [],
): Promise<void> => {
  const facts = extractStellarPaymentFacts(scan, page);
  const completed = page.nextCursor === null;

  await withDatabaseTransaction(async (session) => {
    const updated = await StellarActivityScan.updateOne(
      { _id: scan._id, status: 'running', leaseUntil: scan.leaseUntil, cursor: scan.cursor },
      {
        $set: {
          status: completed ? 'completed' : 'queued',
          active: !completed,
          cursor: page.nextCursor ?? scan.cursor,
          summary: merged.summary,
          lastDay: merged.lastDay,
          lastTransactionHash: merged.lastTransactionHash,
          pagesProcessed: scan.pagesProcessed + 1,
          consecutiveFailures: 0,
          scheduledAt: now,
          leaseUntil: null,
          completedAt: completed ? now : null,
          lastProcessedAt: now,
          lastError: null,
        },
      },
      { runValidators: true, session },
    );

    if (updated.matchedCount !== 1) {
      return;
    }

    if (facts.length > 0) {
      await StellarPaymentFact.bulkWrite(
        facts.map((fact) => ({
          updateOne: {
            filter: { scan: fact.scan, operationId: fact.operationId },
            update: { $setOnInsert: fact },
            upsert: true,
          },
        })),
        { session },
      );
    }

    if (sorobanEvidence.length > 0) {
      await SorobanTransactionEvidence.bulkWrite(
        sorobanEvidence.map(({ operationIds, initiatedOperation, ...evidence }) => ({
          updateOne: {
            filter: { scan: evidence.scan, transactionHash: evidence.transactionHash },
            update: {
              $setOnInsert: {
                ...evidence,
                ...(!initiatedOperation ? { initiatedOperation: false } : {}),
              },
              $addToSet: { operationIds: { $each: operationIds } },
              ...(initiatedOperation ? { $set: { initiatedOperation: true } } : {}),
            },
            upsert: true,
          },
        })),
        { session },
      );
    }
  });
};

export default persistStellarPaymentPage;
