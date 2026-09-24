import XRateLimitError from '../../../../services/integration/xRateLimit.js';
import type { XUser, XUserResponse } from '../../../../types/integration/x.js';
import { X_AUTHENTICATED_USER_URL } from '../../../../constants/services/oauth/x.js';
import XApiResponseError from '../../../../services/integration/xApiResponseError.js';

const getAuthenticatedXUser = async (accessToken: string): Promise<XUser> => {
  const response = await fetch(X_AUTHENTICATED_USER_URL, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    throw new XRateLimitError(response);
  }

  const result = (await response.json()) as XUserResponse;

  if (!response.ok) {
    throw new XApiResponseError(
      response.status,
      'user lookup',
      result.errors?.[0]?.detail ??
        result.errors?.[0]?.title ??
        result.detail ??
        result.title ??
        'Unknown X API error',
    );
  }

  if (!result.data) {
    throw new Error('X user lookup returned no profile');
  }

  return result.data;
};

export { getAuthenticatedXUser };
