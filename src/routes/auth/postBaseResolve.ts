import type { RequestHandler } from 'express';

import log from '../../logger';
import Identity from '../../models/Identity';
import EvmAccount from '../../models/EvmAccount';
import { withDatabaseTransaction } from '../../db';
import PrivyIdentity from '../../models/PrivyIdentity';
import isBaseAddress from '../../utils/base/isBaseAddress';
import verifyPrivyUser from '../../services/auth/privy/verifyPrivyUser';
import parsePrivyUserId from '../../services/auth/privy/parsePrivyUserId';
import getPrivyAddresses from '../../services/auth/privy/getPrivyAddresses';
import findPrivyIdentityInSession from '../../services/auth/privy/findPrivyIdentityInSession';

const postBaseResolve: RequestHandler = async (req, res) => {
  res.set('Cache-Control', 'no-store');

  const userId = parsePrivyUserId(req.body?.userId);
  const address: unknown = req.body?.address;

  if (!userId || typeof address !== 'string' || !isBaseAddress(address)) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid user ID and EVM address are required',
      result: {},
    });
  }

  try {
    if (!(await verifyPrivyUser(req.get('authorization'), userId))) {
      return res.status(401).json({
        status: 'error',
        message: 'Privy user verification failed',
        result: {},
      });
    }

    if (!(await getPrivyAddresses(userId, address))) {
      return res.status(401).json({
        status: 'error',
        message: 'Privy wallet verification failed',
        result: {},
      });
    }

    const result = await withDatabaseTransaction(async (session) => {
      const known = await findPrivyIdentityInSession(userId, session);
      const account = await EvmAccount.findOne({ address: address.toLowerCase() }).session(session);

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

      await PrivyIdentity.updateOne(
        { userId },
        { $setOnInsert: { userId, identity: identity._id } },
        { upsert: true, session },
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

export default postBaseResolve;
