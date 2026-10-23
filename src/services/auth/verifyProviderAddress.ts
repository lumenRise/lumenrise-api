import { parseExternalUserId } from '../../utils/services/auth/provider/parseExternalUserId';
import { requestAuthProvider } from '../../utils/services/auth/provider/requestAuthProvider';

const verifyProviderAddress = async (userId: string, address: string): Promise<boolean> => {
  const result = await requestAuthProvider('server/wallets/verify', {
    address,
    user_id: Number(userId),
  });

  return Boolean(
    result &&
    typeof result === 'object' &&
    'exists' in result &&
    result.exists === true &&
    'user_id' in result &&
    parseExternalUserId(result.user_id) === userId &&
    'network' in result &&
    result.network === 'stellar',
  );
};

export default verifyProviderAddress;
