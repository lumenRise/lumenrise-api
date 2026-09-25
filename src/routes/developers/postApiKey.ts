import type { RequestHandler } from 'express';

import log from '../../logger.js';
import createApiKey from '../../services/developer/createApiKey.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { DeveloperApiKeyCreatedResult } from '../../types/developer/api.js';

const postDeveloperApiKeyRoute: RequestHandler = async (req, res) => {
  const label = req.body?.label;

  if (typeof label !== 'string' || label.trim().length < 1 || label.trim().length > 80) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid API key label',
      result: {},
    });
  }

  try {
    const key = await createApiKey(req.auth!.identityId, label.trim());

    if (!key) {
      return res.status(409).json({
        status: 'error',
        message: 'Too many active API keys',
        result: {},
      });
    }

    const response: ApiResponse<DeveloperApiKeyCreatedResult> = {
      status: 'success',
      message: 'API key created; save it now because it cannot be retrieved again',
      result: key,
    };

    res.setHeader('Cache-Control', 'no-store');

    return res.status(201).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'API key creation failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'API key creation is temporarily unavailable',
      result: {},
    };

    return res.status(503).json(response);
  }
};

export default postDeveloperApiKeyRoute;
