import type { Types } from 'mongoose';

import env from '../../../../env';
import { wakeStellarScan } from './wakeStellarScan';
import StellarActivityScan from '../../../../models/StellarActivityScan';
import type { StellarActivityScanEnqueueResult } from '../../../../types/stellar/scan';
import { createEmptyStellarActivityAggregate } from '../mergeActivityPage/createEmptyStellarActivityAggregate';
const enqueueStellarActivityScan = async (
  identity: Types.ObjectId,
  address: string,
): Promise<StellarActivityScanEnqueueResult> => {
  const sourceUrl = env.STELLAR_HORIZON_URL;
  const existing = await StellarActivityScan.findOne({ identity, active: true });

  if (existing) {
    if (existing.status === 'queued') {
      await wakeStellarScan(existing._id.toString());
    }
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

    await wakeStellarScan(scan._id.toString());
    return { scan, conflict: false };
  } catch (error) {
    if (typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 11_000) {
      throw error;
    }

    const scan = await StellarActivityScan.findOne({ identity, active: true });

    if (!scan) {
      throw error;
    }

    if (scan.status === 'queued') {
      await wakeStellarScan(scan._id.toString());
    }
    return { scan, conflict: scan.address !== address || scan.sourceUrl !== sourceUrl };
  }
};

export { enqueueStellarActivityScan };
