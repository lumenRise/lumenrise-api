import type { RequestHandler } from 'express';

import log from '../../logger';
import LaunchDraft from '../../models/LaunchDraft';
import toDraftResult from '../../utils/launch/toDraftResult';

const getLaunchDraftsRoute: RequestHandler = async (req, res) => {
  try {
    const drafts = await LaunchDraft.find({ ownerIdentityId: req.auth!.identityId })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(50)
      .lean();

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      status: 'success',
      message: 'Drafts retrieved',
      result: { items: drafts.map(toDraftResult) },
    });
  } catch (error) {
    log.error({ error }, 'Launch draft list failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch drafts are unavailable', result: {} });
  }
};

export default getLaunchDraftsRoute;
