import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../logger';
import TokenImage from '../../models/TokenImage';

const getLaunchImageRoute: RequestHandler = async (req, res) => {
  const imageId = req.params.imageId;

  if (typeof imageId !== 'string' || !isValidObjectId(imageId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid image ID', result: {} });
  }

  try {
    const image = await TokenImage.findOne({
      _id: imageId,
      ownerIdentityId: req.auth!.identityId,
    }).lean();

    if (!image) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Token image not found', result: {} });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Token image retrieved',
      result: {
        imageId: image._id.toString(),
        network: image.network,
        ownerAddress: image.ownerAddress,
        publicUrl: image.publicUrl,
        status: image.status,
        launchContractId: image.launchContractId,
        assetContractId: image.assetContractId,
        cleanupReadyAt: image.cleanupReadyAt?.toISOString() ?? null,
        expiredAt: image.expiredAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    log.error({ error }, 'Token image lookup failed');
    return res.status(503).json({ status: 'error', message: 'Token image lookup is unavailable', result: {} });
  }
};

export default getLaunchImageRoute;
