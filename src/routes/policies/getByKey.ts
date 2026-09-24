import type { RequestHandler } from 'express';

import log from '../../logger.js';
import Policy from '../../models/Policy.js';
import type { PolicyResult } from '../../types/policy/api.js';
import toPolicyResult from '../../utils/policy/toPolicyResult.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';

const getPolicyByKeyRoute: RequestHandler = async (req, res) => {
  const key = req.params.key;

  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]{2,63}$/.test(key)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid policy key',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const policy = await Policy.findOne({ ownerIdentity: req.auth!.identityId, key }).sort({
      version: -1,
    });

    if (!policy) {
      return res.status(404).json({ status: 'error', message: 'Policy not found', result: {} });
    }

    const response: ApiResponse<PolicyResult> = {
      status: 'success',
      message: 'Policy retrieved',
      result: toPolicyResult(policy),
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId, key }, 'Policy lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Policy is temporarily unavailable',
      result: {},
    });
  }
};

export default getPolicyByKeyRoute;
