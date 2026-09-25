import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import env from '../../env.js';
import log from '../../logger.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { SorobanEvidenceResult } from '../../types/stellar/soroban.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import SorobanTransactionEvidence from '../../models/SorobanTransactionEvidence.js';
import extractSorobanEnvelopeEvidence from '../../services/stellar/extractSorobanEnvelopeEvidence.js';

const getSorobanEvidenceRoute: RequestHandler = async (req, res) => {
  const address = typeof req.params.address === 'string' ? req.params.address.toUpperCase() : '';
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const cursor = req.query.cursor;

  if (
    !isValidStellarGAddress(address) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (cursor !== undefined && (typeof cursor !== 'string' || !/^[a-f\d]{24}$/i.test(cursor)))
  ) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Soroban evidence request',
      result: {},
    };
    return res.status(400).json(response);
  }

  try {
    const scan = await StellarActivityScan.findOne({
      identity: req.auth!.identityId,
      address,
      sourceUrl: env.STELLAR_HORIZON_URL,
    }).sort({ createdAt: -1 });

    if (!scan) {
      return res.status(404).json({
        status: 'error',
        message: 'Stellar activity scan was not found',
        result: {},
      });
    }

    const filter = {
      scan: scan._id,
      ...(typeof cursor === 'string' ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
    };
    const [records, totals] = await Promise.all([
      SorobanTransactionEvidence.find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1),
      SorobanTransactionEvidence.aggregate<{
        _id: string;
        count: number;
      }>([{ $match: { scan: scan._id } }, { $group: { _id: '$rpcStatus', count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(totals.map(({ _id, count }) => [_id, count]));
    const items = records.slice(0, limit);
    const response: ApiResponse<SorobanEvidenceResult> = {
      status: 'success',
      message: 'Soroban evidence retrieved',
      result: {
        scanId: scan._id.toString(),
        address,
        ownershipVerified: false,
        source: 'horizon_and_stellar_rpc',
        scanStatus: scan.status,
        availableHistoryScanned: scan.status === 'completed',
        coverage: {
          discoveredTransactions: Object.values(counts).reduce((sum, count) => sum + count, 0),
          rpcQueued: counts.queued ?? 0,
          rpcRunning: counts.running ?? 0,
          rpcSuccess: counts.success ?? 0,
          rpcFailed: counts.failed ?? 0,
          rpcNotFound: counts.not_found ?? 0,
          rpcUnavailable: counts.unavailable ?? 0,
        },
        items: items.map((item) => ({
          transactionHash: item.transactionHash,
          operationIds: item.operationIds,
          initiatedOperation: item.initiatedOperation,
          observedAt: item.observedAt.toISOString(),
          rpcStatus: item.rpcStatus,
          attempts: item.attempts,
          ledger: item.ledger,
          returnValueXdr: item.returnValueXdr,
          envelope: extractSorobanEnvelopeEvidence(item.envelopeXdr),
          events: item.events.map((event) => ({
            operationIndex: event.operationIndex,
            eventIndex: event.eventIndex,
            contractId: event.contractId,
            eventXdr: event.eventXdr,
          })),
        })),
        nextCursor: records.length > limit ? items.at(-1)!._id.toString() : null,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, address }, 'Soroban evidence lookup failed');
    return res.status(503).json({
      status: 'error',
      message: 'Soroban evidence is temporarily unavailable',
      result: {},
    });
  }
};

export default getSorobanEvidenceRoute;
