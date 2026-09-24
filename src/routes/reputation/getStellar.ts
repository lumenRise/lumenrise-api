import type { RequestHandler } from 'express';

import env from '../../env.js';
import log from '../../logger.js';
import StellarAccount from '../../models/StellarAccount.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { StellarReputationResult } from '../../types/reputation/stellar.js';
import { calculateStellarActivityScore } from '../../services/stellar/activityScore.js';
import { toStellarActivityScanResult } from '../../services/stellar/activityScanQueue.js';

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
      result: {
        address: account.address,
        ownershipVerified: true,
        scanStatus: scan?.status ?? 'not_started',
        scan: scan ? { ...toStellarActivityScanResult(scan), ownershipVerified: true } : null,
        score:
          scan?.status === 'completed'
            ? { ...calculateStellarActivityScore(scan), ownershipVerified: true }
            : null,
      },
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
