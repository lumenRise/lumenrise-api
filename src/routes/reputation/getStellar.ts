import type { RequestHandler } from 'express';

import env from '../../env.js';
import log from '../../logger.js';
import StellarAccount from '../../models/StellarAccount.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { StellarReputationResult } from '../../types/reputation/stellar.js';
import toStellarReputationResult from '../../utils/reputation/toStellarReputationResult.js';

const getStellarReputationRoute: RequestHandler = async (req, res) => {
  try {
    const account = await StellarAccount.findOne({
      identity: req.auth!.identityId,
      isPrimary: true,
      disconnectedAt: null,
    });

    if (!account) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Primary Stellar account was not found',
        result: {},
      };

      return res.status(404).json(response);
    }

    const scan = await StellarActivityScan.findOne({
      identity: req.auth!.identityId,
      address: account.address,
      sourceUrl: env.STELLAR_HORIZON_URL,
    }).sort({ createdAt: -1 });

    const response: ApiResponse<StellarReputationResult> = {
      status: 'success',
      message: 'Stellar reputation retrieved',
      result: toStellarReputationResult(account.address, scan),
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'Stellar reputation lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar reputation is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default getStellarReputationRoute;
