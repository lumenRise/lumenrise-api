import type { RequestHandler } from 'express';

import log from '../../logger.js';
import DeveloperApiKey from '../../models/DeveloperApiKey.js';
import toApiKeyResult from '../../utils/developer/toApiKeyResult.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { DeveloperApiKeyListResult } from '../../types/developer/api.js';

const getDeveloperApiKeysRoute: RequestHandler = async (req, res) => {
  try {
    const keys = await DeveloperApiKey.find({ identity: req.auth!.identityId })
      .sort({ createdAt: -1 })
      .limit(100);
    const response: ApiResponse<DeveloperApiKeyListResult> = {
      status: 'success',
      message: 'API keys retrieved',
      result: { keys: keys.map(toApiKeyResult) },
    };

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'API key listing failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'API keys are temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default getDeveloperApiKeysRoute;
