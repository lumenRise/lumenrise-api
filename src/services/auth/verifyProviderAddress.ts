import Identity from '../../models/Identity';
import StellarAccount from '../../models/StellarAccount';
import { parseExternalUserId } from '../../utils/services/auth/provider/parseExternalUserId';
import { requestAuthProvider } from '../../utils/services/auth/provider/requestAuthProvider';

const verifyProviderAddress = async (userId: string, address: string): Promise<boolean> => {
  let verificationUserId = userId;
  let result: unknown;

  try {
    result = await requestAuthProvider('server/wallets/verify', {
      address,
      user_id: verificationUserId,
    });
  } catch (error) {
    if (
      !/^\d+$/.test(userId) ||
      !(error instanceof Error) ||
      error.message !== 'Auth provider request failed (400)'
    ) {
      throw error;
    }

    // Only an already-linked local account can resolve a retired numeric Blux ID.
    const identity = await Identity.findOne({ externalUserIds: userId }).select('_id');
    const account = await StellarAccount.findOne({ address }).select('identity');

    if (!identity || !account || !identity._id.equals(account.identity)) {
      return false;
    }

    const verified = await requestAuthProvider('server/wallets/verify', { address });

    if (
      !verified ||
      typeof verified !== 'object' ||
      !('exists' in verified) ||
      verified.exists !== true ||
      !('network' in verified) ||
      verified.network !== 'stellar' ||
      !('user_id' in verified)
    ) {
      return false;
    }

    const publicUserId = parseExternalUserId(verified.user_id);

    if (!publicUserId || /^\d+$/.test(publicUserId)) {
      return false;
    }

    const publicIdentity = await Identity.findOne({ externalUserIds: publicUserId }).select('_id');

    if (publicIdentity && !identity._id.equals(publicIdentity._id)) {
      return false;
    }

    verificationUserId = publicUserId;

    result = await requestAuthProvider('server/wallets/verify', {
      address,
      user_id: verificationUserId,
    });
  }

  return Boolean(
    result &&
    typeof result === 'object' &&
    'exists' in result &&
    result.exists === true &&
    'user_id' in result &&
    parseExternalUserId(result.user_id) === verificationUserId &&
    'network' in result &&
    result.network === 'stellar',
  );
};

export default verifyProviderAddress;
