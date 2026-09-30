import { assertXConfiguration } from './assertXConfiguration';
import { X_REVOKE_URL } from '../../../../constants/services/oauth/x';
import { createXBasicAuthorization } from './createXBasicAuthorization';
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
