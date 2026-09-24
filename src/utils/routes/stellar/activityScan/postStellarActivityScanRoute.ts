import type { RequestHandler } from 'express';

import log from '../../../../logger.js';
import { getAddress } from './getAddress.js';
import sendManualRefreshLimit from '../../sendManualRefreshLimit.js';
import type { ApiResponse, EmptyResult } from '../../../../types/response.js';
import isValidStellarGAddress from '../../../stellar/isValidStellarGAddress.js';
import type { StellarActivityScanResult } from '../../../../types/stellar/scan.js';
import reserveManualRefresh from '../../../../services/refresh/reserveManualRefresh.js';
import {
  enqueueStellarActivityScan,
  toStellarActivityScanResult,
} from '../../../../services/stellar/activityScanQueue.js';

const postStellarActivityScanRoute: RequestHandler = async (req, res) => {
  const address = getAddress(req.params.address);

  if (!isValidStellarGAddress(address)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Stellar account address',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const reservation = await reserveManualRefresh(req.auth!.identityId, 'stellar-activity-scan');

    if (!reservation.allowed) {
      return sendManualRefreshLimit(res, reservation.retryAt!);
    }

    const queued = await enqueueStellarActivityScan(req.auth!.identityId, address);

    if (queued.conflict) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Another Stellar activity scan is already active',
        result: {},
      };

      return res.status(409).json(response);
    }

    const response: ApiResponse<StellarActivityScanResult> = {
      status: 'success',
      message: 'Stellar activity scan queued',
      result: toStellarActivityScanResult(queued.scan),
    };

    return res.status(202).json(response);
  } catch (error) {
    log.error({ error, address }, 'Stellar activity scan enqueue failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar activity scan is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export { postStellarActivityScanRoute };
