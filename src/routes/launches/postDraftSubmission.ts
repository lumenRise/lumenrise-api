import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../logger';
import TokenImage from '../../models/TokenImage';
import LaunchDraft from '../../models/LaunchDraft';
import StellarAccount from '../../models/StellarAccount';
import toDraftResult from '../../utils/launch/toDraftResult';
import validateDraftParams from '../../utils/launch/validateDraftParams';

const postDraftSubmissionRoute: RequestHandler = async (req, res) => {
  const draftId = req.params.draftId;
  const { imageId, transactionHash, params } = req.body ?? {};

  if (
    typeof draftId !== 'string' ||
    !isValidObjectId(draftId) ||
    typeof imageId !== 'string' ||
    !isValidObjectId(imageId) ||
    typeof transactionHash !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(transactionHash)
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid draft submission', result: {} });
  }

  try {
    const draft = await LaunchDraft.findOne({
      _id: draftId,
      ownerIdentityId: req.auth!.identityId,
    }).lean();

    if (!draft) {
      return res.status(404).json({ status: 'error', message: 'Draft not found', result: {} });
    }

    if (draft.status !== 'editing') {
      if (
        draft.transactionHash === transactionHash.toLowerCase() &&
        draft.imageId?.toString() === imageId
      ) {
        return res.status(200).json({
          status: 'success',
          message: 'Submission already recorded',
          result: toDraftResult(draft),
        });
      }

      return res
        .status(409)
        .json({ status: 'error', message: 'Draft already submitted', result: {} });
    }

    const connected = await StellarAccount.exists({
      identity: req.auth!.identityId,
      address: draft.ownerAddress,
      disconnectedAt: null,
    });

    if (!connected) {
      return res
        .status(403)
        .json({ status: 'error', message: 'Owner wallet is not connected', result: {} });
    }

    const image = await TokenImage.findOne({
      _id: imageId,
      ownerIdentityId: req.auth!.identityId,
      ownerAddress: draft.ownerAddress,
      network: draft.network,
      status: 'pending',
    }).lean();

    if (!image || !validateDraftParams(params, draft.ownerAddress, image.publicUrl)) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Image or contract parameters are invalid', result: {} });
    }

    const saved = await LaunchDraft.findOneAndUpdate(
      { _id: draftId, ownerIdentityId: req.auth!.identityId, status: 'editing' },
      {
        $set: {
          status: 'submitted',
          imageId: image._id,
          params,
          assetContractId: params.asset,
          transactionHash: transactionHash.toLowerCase(),
          submittedAt: new Date(),
          nextMatchAt: new Date(),
          matchAttempts: 0,
        },
      },
      { new: true },
    ).lean();

    if (!saved) {
      return res
        .status(409)
        .json({ status: 'error', message: 'Draft was submitted concurrently', result: {} });
    }

    res.setHeader('Cache-Control', 'no-store');

    return res
      .status(200)
      .json({ status: 'success', message: 'Submission recorded', result: toDraftResult(saved) });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Transaction or image is already assigned to another draft',
        result: {},
      });
    }

    log.error({ error }, 'Launch draft submission failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch draft is unavailable', result: {} });
  }
};

export default postDraftSubmissionRoute;
