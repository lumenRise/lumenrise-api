import type { RequestHandler } from 'express';

import env from '../../env.js';
import log from '../../logger.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { StellarActivityScoreResult } from '../../types/stellar/score.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import { calculateStellarActivityScore } from '../../services/stellar/activityScore.js';

const getStellarActivityScoreRoute: RequestHandler = async (req, res) => {
  const address = typeof req.params.address === 'string' ? req.params.address.toUpperCase() : '';

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

    if (scan.status !== 'completed') {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Stellar activity scan is not completed',
        result: {},
      };

      return res.status(409).json(response);
    }

    const response: ApiResponse<StellarActivityScoreResult> = {
      status: 'success',
      message: 'Stellar activity score retrieved',
      result: calculateStellarActivityScore(scan),
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, address }, 'Stellar activity score lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar activity score is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default getStellarActivityScoreRoute;
