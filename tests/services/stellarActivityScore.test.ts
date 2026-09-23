import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import type { StellarActivityScanDocument } from '../../src/types/stellar/scan.js';
import {
  calculateStellarActivityScore,
  normalizeActivitySignal,
} from '../../src/services/stellar/activityScore.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const createScan = (status: 'completed' | 'running' = 'completed'): StellarActivityScanDocument =>
  ({
    _id: new Types.ObjectId(),
    address,
    status,
    completedAt: status === 'completed' ? new Date('2026-09-24T12:00:00Z') : null,
    pagesProcessed: 2,
    summary: {
      scope: 'scanned_pages',
      operationCount: 200,
      initiatedOperationCount: 100,
      relatedOperationCount: 100,
      distinctTransactionCount: 150,
      activeDayCount: 45,
      firstObservedAt: '2026-01-01T00:00:00Z',
      lastObservedAt: '2026-09-24T00:00:00Z',
      operationTypeCounts: { payment: 150, change_trust: 50 },
      sentPaymentCount: 0,
      receivedPaymentCount: 0,
      selfPaymentCount: 0,
      trustlineChangeCount: 50,
      offerActionCount: 0,
      contractInvocationCount: 0,
    },
  }) as StellarActivityScanDocument;

describe('Stellar activity score', () => {
  it('is monotonic without imposing a raw activity cap', () => {
    expect(normalizeActivitySignal(0, 45)).toBe(0);
    expect(normalizeActivitySignal(90, 45)).toBeGreaterThan(normalizeActivitySignal(45, 45));
    expect(normalizeActivitySignal(180, 45)).toBeLessThan(100);
  });

  it('returns an explainable address-only score from a completed scan', () => {
    const scan = createScan();
    const result = calculateStellarActivityScore(scan);

    expect(result).toMatchObject({
      address,
      ownershipVerified: false,
      eligibilityProof: false,
      source: 'horizon',
      scanId: scan._id.toString(),
      availableHistoryScanned: true,
      algorithmVersion: 'stellar-activity-v1',
      pagesProcessed: 2,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.signals.map((signal) => signal.key)).toEqual([
      'active_day_count',
      'distinct_transaction_count',
      'initiated_operation_count',
      'operation_type_diversity',
    ]);
    expect(result.signals.reduce((total, signal) => total + signal.weight, 0)).toBe(1);
  });

  it('rejects incomplete scans and invalid metrics', () => {
    expect(() => calculateStellarActivityScore(createScan('running'))).toThrow('completed scan');

    const scan = createScan();

    scan.summary.activeDayCount = -1;

    expect(() => calculateStellarActivityScore(scan)).toThrow('Invalid Stellar');
  });
});
