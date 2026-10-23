import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import log from '../../logger';
import Identity from '../../models/Identity';
import { withDatabaseTransaction } from '../../db';
import StellarAccount from '../../models/StellarAccount';
import { parseExternalUserId } from '../../services/auth/provider';
import verifyProviderAddress from '../../services/auth/verifyProviderAddress';

const postResolve: RequestHandler = async (req, res) => {
  res.set('Cache-Control', 'no-store');

  const userId = parseExternalUserId(req.body?.userId);
  const address: unknown = req.body?.address;

  if (!userId || typeof address !== 'string' || !StrKey.isValidEd25519PublicKey(address)) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid user ID and Stellar address are required',
      result: {},
    });
  }

  try {
    if (!(await verifyProviderAddress(userId, address))) {
      return res.status(401).json({
        status: 'error',
        message: 'Auth provider wallet verification failed',
        result: {},
      });
    }

    const result = await withDatabaseTransaction(async (session) => {
      const known = await Identity.findOne({ externalUserIds: userId }).session(session);
      const account = await StellarAccount.findOne({ address }).session(session);

      if (known && account && !known._id.equals(account.identity)) {
        return { code: 409, identity: null };
      }

      const identity =
        known ?? (account ? await Identity.findById(account.identity).session(session) : null);

      if (account && !identity) {
        return { code: 409, identity: null };
      }

      if (!identity) {
        return { code: 200, identity: null };
      }

      if (identity.status !== 'active') {
        return { code: 403, identity: null };
      }

      await Identity.updateOne(
        { _id: identity._id },
        { $addToSet: { externalUserIds: userId } },
        { session },
      );

      return { code: 200, identity };
    });

    if (result.code !== 200) {
      return res.status(result.code).json({
        status: 'error',
        message:
          result.code === 403 ? 'Identity is not active' : 'Wallet belongs to another identity',
        result: {},
      });
    }

    const identity = result.identity;

    return res.status(200).json({
      status: 'success',
      message: 'Registration status',
      result: identity?.name?.trim()
        ? {
            registered: true,
            userId,
            identityId: identity._id.toString(),
            name: identity.name,
            avatarUrl: identity.avatarUrl ?? null,
          }
        : { registered: false, userId },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'User ID is already assigned to another identity',
        result: {},
      });
    }

    log.error({ error }, 'Identity resolution failed');

    return res.status(503).json({
      status: 'error',
      message: 'Identity resolution is temporarily unavailable',
      result: {},
    });
  }
};

export default postResolve;
