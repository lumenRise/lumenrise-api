import { X_TOKEN_URL } from '../../../../constants/services/oauth/x';
import type { XTokenResponse } from '../../../../types/integration/x';
import { createXBasicAuthorization } from './createXBasicAuthorization';

const requestXToken = async (body: URLSearchParams): Promise<XTokenResponse> => {
  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: createXBasicAuthorization(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const result = (await response.json()) as XTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'X token exchange failed');
  }

  return result;
};

export { requestXToken };
