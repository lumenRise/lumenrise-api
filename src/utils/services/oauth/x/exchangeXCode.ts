import env from '../../../../env.js';
import { requestXToken } from './requestXToken.js';
import type { XTokenResponse } from '../../../../types/integration/x.js';

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
