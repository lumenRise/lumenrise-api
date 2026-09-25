import type { RequestHandler } from 'express';

import log from '../logger.js';
import Identity from '../models/Identity.js';
import hashApiKey from '../utils/developer/hashApiKey.js';
import DeveloperApiKey from '../models/DeveloperApiKey.js';
import { API_KEY_WINDOW_MS } from '../constants/developer.js';
import reserveApiUsage from '../services/developer/reserveApiUsage.js';

const requireDeveloperApiKey: RequestHandler = async (req, res, next) => {
  const apiKey = req.get('x-api-key');

  if (!apiKey || !/^lrk_[A-Za-z0-9_-]{43}$/.test(apiKey)) {
    return res.status(401).json({
      status: 'error',
      message: 'API key required',
      result: {},
    });
  }

  try {
    const now = new Date();
    const key = await DeveloperApiKey.findOne({
      tokenHash: hashApiKey(apiKey),
      revokedAt: null,
      expiresAt: { $gt: now },
    });

    if (
      !key ||
      !(await Identity.exists({ _id: key.identity, status: 'active', deletedAt: null }))
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired API key',
        result: {},
      });
    }

    if (!(await reserveApiUsage(key.identity, now))) {
      const retryAfter = Math.ceil(
        (API_KEY_WINDOW_MS - (now.getTime() % API_KEY_WINDOW_MS)) / 1_000,
      );

      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        status: 'error',
        message: 'API key quota exceeded',
        result: {},
      });
    }

    req.developerIdentityId = key.identity;

    return next();
  } catch (error) {
    log.error({ error }, 'Developer API authentication failed');

    return res.status(503).json({
      status: 'error',
      message: 'Developer API is temporarily unavailable',
      result: {},
    });
  }
};

export default requireDeveloperApiKey;
