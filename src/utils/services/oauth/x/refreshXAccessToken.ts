import { requestXToken } from './requestXToken';
import { assertXConfiguration } from './assertXConfiguration';
import type { XTokenResponse } from '../../../../types/integration/x';

const refreshXAccessToken = async (refreshToken: string): Promise<XTokenResponse> => {
  assertXConfiguration();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return requestXToken(body);
};

export { refreshXAccessToken };
