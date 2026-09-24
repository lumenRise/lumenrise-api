import type { RequestHandler } from 'express';

import log from '../../logger.js';
import Policy from '../../models/Policy.js';
import type { PolicyResult } from '../../types/policy/api.js';
import toPolicyResult from '../../utils/policy/toPolicyResult.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import parsePolicyDefinition from '../../utils/policy/parsePolicyDefinition.js';

const postPolicyRoute: RequestHandler = async (req, res) => {
  const definition = parsePolicyDefinition(req.body);

  if (!definition) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid policy definition',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const policy = await Policy.create({ ...definition, ownerIdentity: req.auth!.identityId });
    const response: ApiResponse<PolicyResult> = {
      status: 'success',
      message: 'Policy created',
      result: toPolicyResult(policy),
    };

    res.setHeader('Location', `/v1/policies/${policy.key}`);

    return res.status(201).json(response);
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 11_000) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'This policy version already exists',
        result: {},
      };

      return res.status(409).json(response);
    }

    log.error({ error, identityId: req.auth!.identityId }, 'Policy creation failed');

    return res.status(503).json({
      status: 'error',
      message: 'Policy creation is temporarily unavailable',
      result: {},
    });
  }
};

export default postPolicyRoute;
