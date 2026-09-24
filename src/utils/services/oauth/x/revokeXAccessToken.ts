import { assertXConfiguration } from './assertXConfiguration.js';
import { X_REVOKE_URL } from '../../../../constants/services/oauth/x.js';
import { createXBasicAuthorization } from './createXBasicAuthorization.js';

const revokeXAccessToken = async (accessToken: string): Promise<void> => {
  assertXConfiguration();

  const body = new URLSearchParams({ token: accessToken });
  const response = await fetch(X_REVOKE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: createXBasicAuthorization(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`X token revocation failed with status ${response.status}`);
  }
};

export { revokeXAccessToken };
