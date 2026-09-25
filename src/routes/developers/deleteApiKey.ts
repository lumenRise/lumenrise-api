import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../logger.js';
import DeveloperApiKey from '../../models/DeveloperApiKey.js';

const deleteDeveloperApiKeyRoute: RequestHandler = async (req, res) => {
  const id = req.params.id;

  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid API key ID', result: {} });
  }

  try {
    const key = await DeveloperApiKey.findOneAndUpdate(
      { _id: id, identity: req.auth!.identityId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' },
    );

    if (!key) {
      return res.status(404).json({ status: 'error', message: 'API key not found', result: {} });
    }

    return res.status(200).json({ status: 'success', message: 'API key revoked', result: {} });
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'API key revocation failed');

    return res.status(503).json({
      status: 'error',
      message: 'API key revocation is temporarily unavailable',
      result: {},
    });
  }
};

export default deleteDeveloperApiKeyRoute;
