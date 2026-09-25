import type { RequestHandler } from 'express';

import log from '../../logger.js';
import getReputationProfile from '../../services/reputation/profile.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';

const getOwnDeveloperProfileRoute: RequestHandler = async (req, res) => {
  try {
    const profile = await getReputationProfile(req.developerIdentityId!);

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Identity not found', result: {} });
    }

    const response: ApiResponse<ReputationProfileResult> = {
      status: 'success',
      message: 'Reputation profile retrieved',
      result: profile,
    };

    res.setHeader('Cache-Control', 'private, no-store');

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error }, 'Developer profile lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Reputation profile is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default getOwnDeveloperProfileRoute;
