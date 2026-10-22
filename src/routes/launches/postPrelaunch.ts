import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchName from '../../models/LaunchName';
import TokenImage from '../../models/TokenImage';
import StellarAccount from '../../models/StellarAccount';
import isR2Configured from '../../storage/isR2Configured';
import toLaunchSlug from '../../utils/launch/toLaunchSlug';
import uploadTokenImage from '../../services/tokenImage/uploadTokenImage';
import processTokenImage from '../../services/tokenImage/processTokenImage';
import deleteAvatarOrQueue from '../../services/avatar/deleteAvatarOrQueue';
import parseOptionalProjectUrl from '../../utils/launch/parseOptionalProjectUrl';

const postPrelaunchRoute: RequestHandler = async (req, res) => {
  if (!isR2Configured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Image storage is not configured', result: {} });
  }

  const network = req.network;
  const ownerAddress: unknown = req.body?.ownerAddress;

  if (
    (req.body?.network !== undefined && req.body.network !== network) ||
    typeof ownerAddress !== 'string' ||
    !StrKey.isValidEd25519PublicKey(ownerAddress) ||
    !req.file
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid network, ownerAddress and image are required',
      result: {},
    });
  }

  let slug: string;
  let projectName: string;
  let website: string | undefined;
  let xAccount: string | undefined;

  try {
    if (typeof req.body?.name !== 'string') {
      throw new Error('Project name is required');
    }

    projectName = req.body.name.trim();
    slug = toLaunchSlug(projectName);
    website = parseOptionalProjectUrl(req.body?.website);
    xAccount = parseOptionalProjectUrl(req.body?.xAccount);
  } catch {
    return res.status(400).json({
      status: 'error',
      message: 'A valid project name and optional HTTPS website and xAccount links are required',
      result: {},
    });
  }

  const body = await processTokenImage(req.file.buffer);

  if (!body) {
    return res.status(400).json({
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
      return res.status(403).json({
        status: 'error',
        message: 'Owner wallet is not connected to this user',
        result: {},
      });
    }

    const existing = await Launch.exists({ network, slug });

    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Project name is already taken', result: {} });
    }

    const stored = await uploadTokenImage(network, body);

    try {
      const image = await TokenImage.create({
        ownerIdentityId: req.auth!.identityId,
        ownerAddress,
        network,
        slug,
        projectName,
        ...stored,
        website,
        xAccount,
        status: 'pending',
      });

      try {
        await LaunchName.findOneAndUpdate(
          { network, slug, status: 'expired' },
          { $set: { ownerAddress, publicUrl: stored.publicUrl, status: 'reserved', contractId: null } },
          { upsert: true },
        );
      } catch (error) {
        await LaunchName.updateOne(
          { network, slug, ownerAddress, publicUrl: stored.publicUrl, status: 'reserved', contractId: null },
          { $set: { status: 'expired' } },
        );

        await TokenImage.updateOne({ _id: image._id }, { $set: { status: 'expired', expiredAt: new Date() } });

        throw error;
      }

      return res.status(201).json({
        status: 'success',
        message: 'Prelaunch data saved',
        result: {
          imageId: image._id.toString(),
          publicUrl: stored.publicUrl,
          slug,
          name: projectName,
          status: 'pending',
        },
      });
    } catch (error) {
      await deleteAvatarOrQueue(stored.objectKey);
      throw error;
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Project name is already taken', result: {} });
    }

    log.error({ error }, 'Token image upload failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Token image upload is unavailable', result: {} });
  }
};

export default postPrelaunchRoute;
