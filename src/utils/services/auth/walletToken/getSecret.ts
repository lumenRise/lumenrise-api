import env from '../../../../env';
import { developmentSecret } from '../../../../constants/services/auth/walletToken';

const getSecret = (): string => env.AUTH_JWT_SECRET || developmentSecret;

export { getSecret };
