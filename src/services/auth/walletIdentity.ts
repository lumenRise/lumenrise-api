import { Types } from 'mongoose';

import Identity from '../../models/Identity.js';
import { withDatabaseTransaction } from '../../db.js';
import { issueWalletSession } from './walletToken.js';
import StellarAccount from '../../models/StellarAccount.js';
import { consumeSignedWalletChallenge } from './walletChallenge.js';
import type { WalletAuthServiceResult } from '../../types/auth/wallet.js';

const registerWalletIdentity = async (
  address: string,
  name: string,
  challengeId: string,
  signedTransaction: string,
): Promise<WalletAuthServiceResult> => {
  if (
    !(await consumeSignedWalletChallenge(challengeId, address, 'register', signedTransaction, name))
  ) {
    return { ok: false, reason: 'invalid_proof' };
  }

  if (await StellarAccount.exists({ address })) {
    return { ok: false, reason: 'already_registered' };
  }

  try {
    return await withDatabaseTransaction(async (databaseSession) => {
      const identityId = new Types.ObjectId();
      const now = new Date();

      await Identity.create([{ _id: identityId, name }], { session: databaseSession });
      await StellarAccount.create(
        [{ identity: identityId, address, isPrimary: true, connectedAt: now }],
        { session: databaseSession },
      );

      const session = await issueWalletSession(identityId, databaseSession);

      return {
        ok: true,
        result: {
          identityId: identityId.toString(),
          address,
          name,
          accessToken: session.token,
          tokenType: 'Bearer',
          expiresAt: session.expiresAt.toISOString(),
        },
      };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 11_000) {
      return { ok: false, reason: 'already_registered' };
    }

    throw error;
  }
};
const loginWalletIdentity = async (
  address: string,
  challengeId: string,
  signedTransaction: string,
): Promise<WalletAuthServiceResult> => {
  if (!(await consumeSignedWalletChallenge(challengeId, address, 'login', signedTransaction))) {
    return { ok: false, reason: 'invalid_proof' };
  }

  const account = await StellarAccount.findOne({ address, disconnectedAt: null });

  if (!account) {
    return { ok: false, reason: 'account_not_found' };
  }

  const identity = await Identity.findOne({
    _id: account.identity,
    status: 'active',
    deletedAt: null,
  });

  if (!identity) {
    return { ok: false, reason: 'account_not_found' };
  }

  const session = await issueWalletSession(identity._id);

  return {
    ok: true,
    result: {
      identityId: identity._id.toString(),
      address,
      name: identity.name,
      accessToken: session.token,
      tokenType: 'Bearer',
      expiresAt: session.expiresAt.toISOString(),
    },
  };
};

export { loginWalletIdentity, registerWalletIdentity };
