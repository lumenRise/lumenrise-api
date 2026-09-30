import { Types } from 'mongoose';

import Identity from '../../../../models/Identity';
import { withDatabaseTransaction } from '../../../../db';
import StellarAccount from '../../../../models/StellarAccount';
import { issueWalletSession } from '../../../../services/auth/walletToken';
import type { WalletAuthServiceResult } from '../../../../types/auth/wallet';
import { consumeSignedWalletChallenge } from '../../../../services/auth/walletChallenge';

const registerWalletIdentity = async (
  address: string,
  name: string,
  challengeId: string,
  signature: string,
): Promise<WalletAuthServiceResult> => {
  if (!(await consumeSignedWalletChallenge(challengeId, address, 'register', signature, name))) {
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

export { registerWalletIdentity };
