import type { RequestHandler } from 'express';

import log from '../../logger.js';
import Policy from '../../models/Policy.js';
import evaluatePolicy from '../../services/policy/evaluatePolicy.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import getReputationProfile from '../../services/reputation/profile.js';
import type { PolicyEvaluation } from '../../types/policy/evaluation.js';
import reserveManualRefresh from '../../services/refresh/reserveManualRefresh.js';
import releaseManualRefresh from '../../services/refresh/releaseManualRefresh.js';
import sendManualRefreshLimit from '../../utils/routes/sendManualRefreshLimit.js';

const evaluatePolicyRoute: RequestHandler = async (req, res) => {
  const key = req.params.key;

  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]{2,63}$/.test(key)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid policy key',
      result: {},
    };

    return res.status(400).json(response);
  }

  let reservedUntil: Date | null = null;

  try {
    const policy = await Policy.findOne({ ownerIdentity: req.auth!.identityId, key }).sort({
      version: -1,
    });

    if (!policy) {
      return res.status(404).json({ status: 'error', message: 'Policy not found', result: {} });
    }

    const profile = await getReputationProfile(req.auth!.identityId);

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Identity not found', result: {} });
    }

    const reservation = await reserveManualRefresh(
      req.auth!.identityId,
      `policy-evaluation:${key}`,
    );

    if (!reservation.allowed) {
      return sendManualRefreshLimit(res, reservation.retryAt!);
    }

    reservedUntil = reservation.reservedUntil;

    const response: ApiResponse<PolicyEvaluation> = {
      status: 'success',
      message: 'Policy evaluated',
      result: evaluatePolicy(policy, profile),
    };

    return res.status(200).json(response);
  } catch (error) {
    if (reservedUntil) {
      await releaseManualRefresh(req.auth!.identityId, `policy-evaluation:${key}`, reservedUntil);
    }

    log.error({ error, identityId: req.auth!.identityId, key }, 'Policy evaluation failed');

    return res.status(503).json({
      status: 'error',
      message: 'Policy evaluation is temporarily unavailable',
      result: {},
    });
  }
};

export default evaluatePolicyRoute;
