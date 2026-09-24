import type { RequestHandler } from 'express';

import env from '../../env.js';
import log from '../../logger.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { StellarActivityScanResult } from '../../types/stellar/scan.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import { getAddress } from '../../utils/routes/stellar/activityScan/getAddress.js';
import { toStellarActivityScanResult } from '../../services/stellar/activityScanQueue.js';
import { postStellarActivityScanRoute } from '../../utils/routes/stellar/activityScan/postStellarActivityScanRoute.js';

const getStellarActivityScanRoute: RequestHandler = async (req, res) => {
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
    const scan = await StellarActivityScan.findOne({
      identity: req.auth!.identityId,
      address,
      sourceUrl: env.STELLAR_HORIZON_URL,
    }).sort({ createdAt: -1 });

    if (!scan) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Stellar activity scan was not found',
        result: {},
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<StellarActivityScanResult> = {
      status: 'success',
      message: 'Stellar activity scan retrieved',
      result: toStellarActivityScanResult(scan),
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, address }, 'Stellar activity scan lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar activity scan is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export { getStellarActivityScanRoute, postStellarActivityScanRoute };
