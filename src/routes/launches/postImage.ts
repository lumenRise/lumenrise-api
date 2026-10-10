import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import TokenImage from '../../models/TokenImage';
import StellarAccount from '../../models/StellarAccount';
import isR2Configured from '../../storage/isR2Configured';
import uploadTokenImage from '../../services/tokenImage/uploadTokenImage';
import processTokenImage from '../../services/tokenImage/processTokenImage';
import deleteAvatarOrQueue from '../../services/avatar/deleteAvatarOrQueue';

const postLaunchImageRoute: RequestHandler = async (req, res) => {
  if (!isR2Configured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Image storage is not configured', result: {} });
  }

  const network: unknown = req.body?.network;
  const ownerAddress: unknown = req.body?.ownerAddress;

  if (
    (network !== 'testnet' && network !== 'public') ||
    network !== env.STELLAR_AUTH_NETWORK ||
    typeof ownerAddress !== 'string' ||
    !StrKey.isValidEd25519PublicKey(ownerAddress) ||
    !req.file
  ) {
    return res
      .status(400)
      .json({
        status: 'error',
        message: 'Valid network, ownerAddress and image are required',
        result: {},
      });
  }

  const body = await processTokenImage(req.file.buffer);
  if (!body) {
    return res
      .status(400)
      .json({
        status: 'error',
        message: 'Image must be a valid JPEG, PNG or WebP of at least 128x128 pixels',
        result: {},
      });
  }

  try {
    const account = await StellarAccount.exists({
      identity: req.auth!.identityId,
      address: ownerAddress,
      disconnectedAt: null,
    });
    if (!account) {
      return res
        .status(403)
        .json({
          status: 'error',
          message: 'Owner wallet is not connected to this user',
          result: {},
        });
    }

    const stored = await uploadTokenImage(network, body);
    try {
      const image = await TokenImage.create({
        ownerIdentityId: req.auth!.identityId,
        ownerAddress,
        network,
        ...stored,
        status: 'pending',
      });

      return res.status(201).json({
        status: 'success',
        message: 'Token image uploaded',
        result: {
          imageId: image._id.toString(),
          publicUrl: stored.publicUrl,
          status: 'pending',
        },
      });
    } catch (error) {
      await deleteAvatarOrQueue(stored.objectKey);
      throw error;
    }
  } catch (error) {
    log.error({ error }, 'Token image upload failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Token image upload is unavailable', result: {} });
  }
};

export default postLaunchImageRoute;
