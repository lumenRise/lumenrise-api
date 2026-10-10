import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../logger';
import LaunchDraft from '../../models/LaunchDraft';
import toDraftResult from '../../utils/launch/toDraftResult';
import validateDraftData from '../../utils/launch/validateDraftData';

const patchLaunchDraftRoute: RequestHandler = async (req, res) => {
  const draftId = req.params.draftId;

  if (
    typeof draftId !== 'string' ||
    !isValidObjectId(draftId) ||
    !validateDraftData(req.body?.data)
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid draft update', result: {} });
  }

  try {
    const draft = await LaunchDraft.findOneAndUpdate(
      { _id: draftId, ownerIdentityId: req.auth!.identityId, status: 'editing' },
      { $set: { data: req.body.data } },
      { new: true },
    ).lean();

    if (!draft) {
      return res.status(409).json({
        status: 'error',
        message: 'Draft is unavailable or already submitted',
        result: {},
      });
    }

    res.setHeader('Cache-Control', 'no-store');

    return res
      .status(200)
      .json({ status: 'success', message: 'Draft updated', result: toDraftResult(draft) });
  } catch (error) {
    log.error({ error }, 'Launch draft update failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch draft is unavailable', result: {} });
  }
};

export default patchLaunchDraftRoute;
