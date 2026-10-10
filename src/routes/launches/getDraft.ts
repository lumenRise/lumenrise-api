import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../logger';
import LaunchDraft from '../../models/LaunchDraft';
import toDraftResult from '../../utils/launch/toDraftResult';

const getLaunchDraftRoute: RequestHandler = async (req, res) => {
  const draftId = req.params.draftId;

  if (typeof draftId !== 'string' || !isValidObjectId(draftId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid draft ID', result: {} });
  }

  try {
    const draft = await LaunchDraft.findOne({
      _id: draftId,
      ownerIdentityId: req.auth!.identityId,
    }).lean();

    if (!draft) {
      return res.status(404).json({ status: 'error', message: 'Draft not found', result: {} });
    }

    res.setHeader('Cache-Control', 'no-store');

    return res
      .status(200)
      .json({ status: 'success', message: 'Draft retrieved', result: toDraftResult(draft) });
  } catch (error) {
    log.error({ error }, 'Launch draft lookup failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch draft is unavailable', result: {} });
  }
};

export default getLaunchDraftRoute;
