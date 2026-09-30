import env from '../../../../env';
import { requestXToken } from './requestXToken';
import type { XTokenResponse } from '../../../../types/integration/x';

const exchangeXCode = async (code: string, codeVerifier: string): Promise<XTokenResponse> => {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.X_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestXToken(body);
};

export { exchangeXCode };
