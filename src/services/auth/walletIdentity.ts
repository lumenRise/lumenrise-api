import Identity from '../../models/Identity';
import { issueWalletSession } from './walletToken';
import StellarAccount from '../../models/StellarAccount';
import { consumeSignedWalletChallenge } from './walletChallenge';
import type { WalletAuthServiceResult } from '../../types/auth/wallet';
import { registerWalletIdentity } from '../../utils/services/auth/walletIdentity/registerWalletIdentity';
const loginWalletIdentity = async (
  address: string,
  challengeId: string,
  signature: string,
): Promise<WalletAuthServiceResult> => {
  if (!(await consumeSignedWalletChallenge(challengeId, address, 'login', signature))) {
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
