import type { RequestHandler } from 'express';

import log from '../../logger.js';
import Policy from '../../models/Policy.js';
import type { PolicyListResult } from '../../types/policy/api.js';
import toPolicyResult from '../../utils/policy/toPolicyResult.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';

const getPoliciesRoute: RequestHandler = async (req, res) => {
  try {
    const policies = await Policy.find({ ownerIdentity: req.auth!.identityId })
      .sort({ key: 1, version: -1 })
      .limit(100);

    const response: ApiResponse<PolicyListResult> = {
      status: 'success',
      message: 'Policies retrieved',
      result: { policies: policies.map(toPolicyResult) },
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'Policy lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Policies are temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default getPoliciesRoute;
