import env from '../../../../env.js';
import { developmentSecret } from '../../../../constants/services/auth/walletToken.js';

const getSecret = (): string => env.AUTH_JWT_SECRET || developmentSecret;

export { getSecret };
