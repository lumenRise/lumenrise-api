import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Identity from '../../models/Identity';
import EvmAccount from '../../models/EvmAccount';
import { withDatabaseTransaction } from '../../db';
import type { StoredAvatar } from '../../types/avatar';
import PrivyIdentity from '../../models/PrivyIdentity';
import isBaseAddress from '../../utils/base/isBaseAddress';
import uploadAvatar from '../../services/avatar/uploadAvatar';
import applicationRules from '../../constants/applicationRules';
import processAvatar from '../../services/avatar/processAvatar';
import verifyPrivyUser from '../../services/auth/privy/verifyPrivyUser';
import parsePrivyUserId from '../../services/auth/privy/parsePrivyUserId';
import getPrivyAddresses from '../../services/auth/privy/getPrivyAddresses';
import deleteAvatarOrQueue from '../../services/avatar/deleteAvatarOrQueue';
import isAvatarStorageConfigured from '../../services/avatar/isAvatarStorageConfigured';
import findPrivyIdentityInSession from '../../services/auth/privy/findPrivyIdentityInSession';

const postBaseRegistration: RequestHandler = async (req, res) => {
  const userId = parsePrivyUserId(req.body?.userId);
  const name: unknown = req.body?.name;
  const address: unknown = req.body?.address;

  if (
    !userId ||
    (address !== undefined && (typeof address !== 'string' || !isBaseAddress(address))) ||
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > applicationRules.profile.nameMaxLength
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid user ID or name', result: {} });
  }

  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Privy is not configured', result: {} });
  }

  if (req.file && !isAvatarStorageConfigured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar storage is not configured', result: {} });
  }

  let uploaded: StoredAvatar | null = null;

  try {
    if (!(await verifyPrivyUser(req.get('authorization'), userId))) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Privy user verification failed', result: {} });
    }

    const avatar = req.file ? await processAvatar(req.file.buffer) : null;

    if (req.file && !avatar) {
      return res.status(400).json({
        status: 'error',
        message: 'Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels',
        result: {},
      });
    }

    const addresses = await getPrivyAddresses(
      userId,
      typeof address === 'string' ? address : undefined,
    );

    if (!addresses) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Privy user verification failed', result: {} });
    }

    if (!addresses.length) {
      return res
        .status(422)
        .json({ status: 'error', message: 'An EVM wallet is required', result: {} });
    }

    const newIdentityId = new Types.ObjectId();

    if (avatar) {
      uploaded = await uploadAvatar(newIdentityId, avatar);
    }

    const result = await withDatabaseTransaction(async (session) => {
      let identity = await findPrivyIdentityInSession(userId, session);
      const accounts = await EvmAccount.find({ address: { $in: addresses } }).session(session);
      const owners = new Set(accounts.map((account) => account.identity.toString()));

      if (
        owners.size > 1 ||
        (identity && [...owners].some((id) => id !== identity!._id.toString()))
      ) {
        return null;
      }

      if (!identity && accounts.length) {
        identity = await Identity.findById(accounts[0]!.identity).session(session);

        if (!identity) {
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
              externalUserIds: [],
              name: name.trim(),
              ...(uploaded
                ? { avatarObjectKey: uploaded.objectKey, avatarUrl: uploaded.publicUrl }
                : {}),
            },
          ],
          { session },
        );

        identity = created[0] ?? null;
      } else if (!identity.name?.trim()) {
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

      await PrivyIdentity.updateOne(
        { userId },
        { $setOnInsert: { userId, identity: identity._id } },
        { upsert: true, session },
      );

      const primary = await EvmAccount.findOne({
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
          await EvmAccount.create(
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

    return res.status(200).json({ status: 'success', message: 'Privy user registered', result });
  } catch (error) {
    if (uploaded) {
      await deleteAvatarOrQueue(uploaded.objectKey);
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res
        .status(409)
        .json({ status: 'error', message: 'User or wallet is already registered', result: {} });
    }

    log.error({ error }, 'Privy registration failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Registration is temporarily unavailable', result: {} });
  }
};

export default postBaseRegistration;
