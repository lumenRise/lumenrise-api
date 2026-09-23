import type { Types } from 'mongoose';

import env from '../../env.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import { createEmptyStellarActivityAggregate } from './mergeActivityPage.js';
import type {
  StellarActivityScanDocument,
  StellarActivityScanEnqueueResult,
  StellarActivityScanResult,
} from '../../types/stellar/scan.js';

const SCAN_LEASE_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const retryDelay = (failures: number): number =>
  Math.min(60_000 * 2 ** Math.max(0, failures - 1), 3_600_000);
const toStellarActivityScanResult = (
  scan: StellarActivityScanDocument,
): StellarActivityScanResult => ({
  id: scan._id.toString(),
  address: scan.address,
  ownershipVerified: false,
  source: 'horizon',
  status: scan.status,
  availableHistoryScanned: scan.status === 'completed',
  cursor: scan.cursor,
  pagesProcessed: scan.pagesProcessed,
  summary: scan.summary,
  lastProcessedAt: scan.lastProcessedAt?.toISOString() ?? null,
  completedAt: scan.completedAt?.toISOString() ?? null,
  lastError: scan.lastError,
});
const enqueueStellarActivityScan = async (
  identity: Types.ObjectId,
  address: string,
): Promise<StellarActivityScanEnqueueResult> => {
  const sourceUrl = env.STELLAR_HORIZON_URL;
  const existing = await StellarActivityScan.findOne({ identity, active: true });

  if (existing) {
    return {
      scan: existing,
      conflict: existing.address !== address || existing.sourceUrl !== sourceUrl,
    };
  }

  try {
    const scan = await StellarActivityScan.create({
      identity,
      address,
      sourceUrl,
      status: 'queued',
      active: true,
      cursor: null,
      summary: createEmptyStellarActivityAggregate(),
      pagesProcessed: 0,
      consecutiveFailures: 0,
      scheduledAt: new Date(),
    });

    return { scan, conflict: false };
  } catch (error) {
    if (typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 11_000) {
      throw error;
    }

    const scan = await StellarActivityScan.findOne({ identity, active: true });

    if (!scan) {
      throw error;
    }

    return { scan, conflict: scan.address !== address || scan.sourceUrl !== sourceUrl };
  }
};
const claimStellarActivityScan = async (
  now = new Date(),
): Promise<StellarActivityScanDocument | null> =>
  StellarActivityScan.findOneAndUpdate(
    {
      active: true,
      $or: [
        { status: 'queued', scheduledAt: { $lte: now } },
        { status: 'running', leaseUntil: { $lte: now } },
      ],
    },
    { $set: { status: 'running', leaseUntil: new Date(now.getTime() + SCAN_LEASE_MS) } },
    { sort: { scheduledAt: 1 }, runValidators: true, returnDocument: 'after' },
  );
const failStellarActivityScan = async (
  scan: StellarActivityScanDocument,
  message: string,
  retryable: boolean,
  now = new Date(),
): Promise<void> => {
  const failures = scan.consecutiveFailures + 1;
  const shouldRetry = retryable && failures < MAX_CONSECUTIVE_FAILURES;

  await StellarActivityScan.updateOne(
    { _id: scan._id, status: 'running', leaseUntil: scan.leaseUntil, cursor: scan.cursor },
    {
      $set: {
        status: shouldRetry ? 'queued' : 'failed',
        active: shouldRetry,
        consecutiveFailures: failures,
        scheduledAt: shouldRetry
          ? new Date(now.getTime() + retryDelay(failures))
          : scan.scheduledAt,
        leaseUntil: null,
        completedAt: shouldRetry ? null : now,
        lastError: message.slice(0, 2_000),
      },
    },
    { runValidators: true },
  );
};

export {
  claimStellarActivityScan,
  enqueueStellarActivityScan,
  failStellarActivityScan,
  toStellarActivityScanResult,
};
