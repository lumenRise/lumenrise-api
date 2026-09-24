import { requestXToken } from './requestXToken.js';
import { assertXConfiguration } from './assertXConfiguration.js';
import type { XTokenResponse } from '../../../../types/integration/x.js';

const refreshXAccessToken = async (refreshToken: string): Promise<XTokenResponse> => {
  assertXConfiguration();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return requestXToken(body);
};

export { refreshXAccessToken };
