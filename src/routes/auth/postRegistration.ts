import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Identity from '../../models/Identity';
import { withDatabaseTransaction } from '../../db';
import type { StoredAvatar } from '../../types/avatar';
import StellarAccount from '../../models/StellarAccount';
import uploadAvatar from '../../services/avatar/uploadAvatar';
import processAvatar from '../../services/avatar/processAvatar';
import deleteAvatarOrQueue from '../../services/avatar/deleteAvatarOrQueue';
import isAvatarStorageConfigured from '../../services/avatar/isAvatarStorageConfigured';
import { getVerifiedProviderAddresses, parseExternalUserId } from '../../services/auth/provider';

const postRegistration: RequestHandler = async (req, res) => {
  const userId = parseExternalUserId(req.body?.userId);
  const name: unknown = req.body?.name;

  if (!userId || typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid user ID or name', result: {} });
  }

  if (!env.AUTH_PROVIDER_API_URL || !env.AUTH_PROVIDER_APP_ID || !env.AUTH_PROVIDER_APP_SECRET) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Auth provider is not configured', result: {} });
  }

  if (req.file && !isAvatarStorageConfigured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar storage is not configured', result: {} });
  }

  let uploaded: StoredAvatar | null = null;

  try {
    const avatar = req.file ? await processAvatar(req.file.buffer) : null;

    if (req.file && !avatar) {
      return res.status(400).json({
        status: 'error',
        message: 'Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels',
        result: {},
      });
    }

    const addresses = await getVerifiedProviderAddresses(userId);

    if (!addresses) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Auth provider user verification failed', result: {} });
    }

    if (!addresses.length) {
      return res
        .status(422)
        .json({ status: 'error', message: 'A Stellar wallet is required', result: {} });
    }

    const newIdentityId = new Types.ObjectId();

    if (avatar) {
      uploaded = await uploadAvatar(newIdentityId, avatar);
    }

    const result = await withDatabaseTransaction(async (session) => {
      let identity = await Identity.findOne({ externalUserId: userId }).session(session);
      const accounts = await StellarAccount.find({ address: { $in: addresses } }).session(session);
      const owners = new Set(accounts.map((account) => account.identity.toString()));

      if (
        owners.size > 1 ||
        (identity && [...owners].some((id) => id !== identity!._id.toString()))
      ) {
        return null;
      }

      if (!identity && accounts.length) {
        identity = await Identity.findById(accounts[0]!.identity).session(session);
        if (!identity || identity.externalUserId) {
          return null;
        }
      }

      if (identity && identity.status !== 'active') {
        return null;
      }

      if (!identity) {
        const created = await Identity.create(
          [
            {
              _id: newIdentityId,
              externalUserId: userId,
              name: name.trim(),
              ...(uploaded
                ? { avatarObjectKey: uploaded.objectKey, avatarUrl: uploaded.publicUrl }
                : {}),
            },
          ],
          { session },
        );

        identity = created[0] ?? null;
      } else if (!identity.externalUserId || !identity.name?.trim()) {
        identity.externalUserId = userId;
        identity.name = identity.name?.trim() ? identity.name : name.trim();

        if (uploaded && !identity.avatarUrl) {
          identity.avatarObjectKey = uploaded.objectKey;
          identity.avatarUrl = uploaded.publicUrl;
        }

        await identity.save({ session });
      }

      if (!identity) {
        throw new Error('Identity creation failed');
      }

      const primary = await StellarAccount.findOne({
        identity: identity._id,
        isPrimary: true,
        disconnectedAt: null,
      }).session(session);

      for (const [index, address] of addresses.entries()) {
        const existing = accounts.find((account) => account.address === address);

        if (existing) {
          existing.disconnectedAt = null;
          existing.isPrimary = primary ? primary.address === address : index === 0;

          await existing.save({ session });
        } else {
          await StellarAccount.create(
            [
              {
                identity: identity._id,
                address,
                isPrimary: !primary && index === 0,
                connectedAt: new Date(),
              },
            ],
            { session },
          );
        }
      }

      return {
        userId,
        identityId: identity._id.toString(),
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
        addresses,
      };
    });

    if (uploaded && result?.avatarUrl !== uploaded.publicUrl) {
      await deleteAvatarOrQueue(uploaded.objectKey);
      uploaded = null;
    }

    if (!result) {
      return res.status(409).json({
        status: 'error',
        message: 'Wallet or identity is already assigned or inactive',
        result: {},
      });
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Auth provider user registered', result });
  } catch (error) {
    if (uploaded) {
      await deleteAvatarOrQueue(uploaded.objectKey);
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res
        .status(409)
        .json({ status: 'error', message: 'User or wallet is already registered', result: {} });
    }

    log.error({ error }, 'Auth provider registration failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Registration is temporarily unavailable', result: {} });
  }
};

export default postRegistration;
